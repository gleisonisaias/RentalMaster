import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, lt, lte, gte } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";

// Export SQL operators
export { eq, and, lt, lte, gte };

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Conectando ao banco de dados...");
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Teste a conexão com o banco de dados
pool.query('SELECT NOW()')
  .then(result => {
    console.log("Conexão com o banco de dados estabelecida com sucesso!", result.rows[0]);
  })
  .catch(error => {
    console.error("Erro ao conectar ao banco de dados:", error);
  });

export const db = drizzle({ client: pool, schema });