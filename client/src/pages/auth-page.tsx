import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Lock, User, Building, Shield } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    email: "",
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData, {
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Erro ao fazer login",
          description: error.message,
        });
      },
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não conferem",
        description: "A senha e a confirmação de senha devem ser iguais.",
      });
      return;
    }
    
    const { confirmPassword, ...userData } = registerData;
    registerMutation.mutate({
      ...userData,
      role: "user", // Por padrão, novos usuários são criados com papel 'user'
    }, {
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Erro ao criar conta",
          description: error.message,
        });
      },
    });
  };

  // Redireciona para a página inicial se o usuário já estiver autenticado
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex h-screen w-full">
      {/* Área de formulário */}
      <div className="flex flex-col justify-center px-4 w-full md:w-1/2 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <Building className="h-10 w-10 mb-2 text-primary" />
            <h1 className="text-2xl font-bold">Sistema de Gestão de Contratos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Acesse sua conta para gerenciar propriedades e contratos
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Entre com seu nome de usuário e senha
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de Usuário</Label>
                  <div className="relative">
                    <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="Seu nome de usuário"
                      className="pl-8"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Sua senha"
                      className="pl-8"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
      
      {/* Área de destaque/informações */}
      <div className="hidden md:flex md:w-1/2 bg-primary text-primary-foreground">
        <div className="flex flex-col justify-center px-8 lg:px-16 w-full">
          <div className="max-w-lg mx-auto">
            <div className="mb-8 flex items-center">
              <Shield className="h-12 w-12 mr-4" />
              <h2 className="text-3xl font-bold">Gestão Simplificada</h2>
            </div>
            
            <h3 className="text-2xl font-semibold mb-6">
              Controle completo sobre imóveis, contratos e pagamentos
            </h3>
            
            <ul className="space-y-4 text-lg">
              <li className="flex items-start">
                <span className="bg-primary-foreground text-primary rounded-full h-6 w-6 flex items-center justify-center mr-2 mt-1">✓</span>
                <span>Gerencie proprietários, inquilinos e imóveis</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary-foreground text-primary rounded-full h-6 w-6 flex items-center justify-center mr-2 mt-1">✓</span>
                <span>Controle contratos e pagamentos</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary-foreground text-primary rounded-full h-6 w-6 flex items-center justify-center mr-2 mt-1">✓</span>
                <span>Gere recibos e contratos em PDF</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary-foreground text-primary rounded-full h-6 w-6 flex items-center justify-center mr-2 mt-1">✓</span>
                <span>Dashboard com informações relevantes</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary-foreground text-primary rounded-full h-6 w-6 flex items-center justify-center mr-2 mt-1">✓</span>
                <span>Acesso seguro com autenticação</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}