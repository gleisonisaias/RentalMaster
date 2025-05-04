import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  console.log('Using session secret:', sessionSecret.substring(0, 5) + '...');
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Desabilitado para compatibilidade em todos ambientes
      httpOnly: true,
      sameSite: 'lax'
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Usuário não encontrado" });
        }
        
        if (!user.isActive) {
          return done(null, false, { message: "Usuário está inativo" });
        }
        
        if (!(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Senha incorreta" });
        }
        
        // Atualiza o último login
        await storage.updateLastLogin(user.id);
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Rotas de autenticação
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Falha na autenticação" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Não autenticado" });
    }
  });

  // Rota de registro removida, agora usuários só podem ser criados por um administrador
  // O antigo /api/register foi substituído pelo /api/admin/users que já existe
  
  // Redirecionamento para rota de admin (para manter compatibilidade com código antigo)
  app.post("/api/register", async (req, res) => {
    return res.status(403).json({ message: "Registro não permitido. Usuários só podem ser criados por um administrador." });
  });

  // Middleware para verificar se usuário está autenticado
  app.use("/api/admin/*", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    // Verifica se o usuário é admin
    const user = req.user as User;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    
    next();
  });

  // Rotas de administração de usuários (protegidas)
  app.get("/api/admin/users", async (req, res, next) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/users", async (req, res, next) => {
    try {
      // Verifica se usuário já existe
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }

      // Cria o usuário com senha criptografada
      const hashedPassword = await hashPassword(req.body.password);
      const newUser = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/admin/users/:id", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Se a senha for alterada, criptografa
      let updateData = { ...req.body };
      if (req.body.password) {
        updateData.password = await hashPassword(req.body.password);
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/admin/users/:id", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Não permite excluir o próprio usuário
      if ((req.user as User).id === userId) {
        return res.status(400).json({ message: "Não é possível excluir seu próprio usuário" });
      }
      
      const result = await storage.deleteUser(userId);
      if (result) {
        res.sendStatus(204);
      } else {
        res.status(404).json({ message: "Usuário não encontrado" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Endpoint para permitir que o usuário altere sua própria senha
  app.put("/api/user/password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user as User;
      const { currentPassword, newPassword } = req.body;

      // Verifica a senha atual
      if (!(await comparePasswords(currentPassword, user.password))) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }

      // Criptografa e atualiza a nova senha
      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(user.id, { password: hashedPassword });

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // Cria um usuário admin inicial se não existir nenhum
  initializeAdmin();
}

// Função para criar um usuário admin inicial
async function initializeAdmin() {
  try {
    const users = await storage.getUsers();
    if (users.length === 0) {
      console.log("Criando usuário administrador padrão...");
      
      const hashedPassword = await hashPassword("admin123");
      await storage.createUser({
        username: "admin",
        password: hashedPassword,
        name: "Administrador",
        email: "admin@example.com",
        role: "admin",
        isActive: true
      });
      
      console.log("Usuário administrador criado com sucesso.");
      console.log("Username: admin");
      console.log("Senha: admin123");
    }
  } catch (error) {
    console.error("Erro ao inicializar usuário admin:", error);
  }
}