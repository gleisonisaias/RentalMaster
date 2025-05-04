import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserRound,
  Home,
  FileText,
  BanknoteIcon,
  BarChart3,
  LogOut,
  UserCog,
  Settings,
  Database,
  ChevronDown,
  ChevronUp,
  Cog,
  FileEdit
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Proprietários", href: "/proprietarios", icon: Users },
  { name: "Inquilinos", href: "/inquilinos", icon: UserRound },
  { name: "Imóveis", href: "/imoveis", icon: Home },
  { name: "Contratos", href: "/contratos", icon: FileText },
  { name: "Modelos", href: "/modelos-contrato", icon: FileEdit },
  { name: "Pagamentos", href: "/pagamentos", icon: BanknoteIcon },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3 },
];

interface SidebarProps {
  onNavigate?: () => void;
}

const Sidebar = ({ onNavigate }: SidebarProps) => {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Função para obter as iniciais do nome do usuário
  const getUserInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  // Função para lidar com a navegação e fechar o menu em dispositivos móveis
  const handleNavigateTo = (path: string) => {
    navigate(path);
    if (onNavigate) {
      onNavigate();
    }
  };

  // Determinar se estamos em uma página de administração
  const isAdminPage = location.startsWith('/admin') || location === '/backup' || location === '/configuracoes';

  return (
    <div className="w-64 bg-white border-r border-neutral-200 flex-shrink-0 h-screen flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200 hidden md:flex justify-between items-center">
        <h1 className="text-xl font-semibold text-neutral-800">ImovelGest</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul>
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.name} className="mb-1 px-2">
                <button
                  onClick={() => handleNavigateTo(item.href)}
                  className={cn(
                    "flex items-center px-4 py-3 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-md group transition-colors w-full text-left",
                    isActive && "border-l-4 border-primary-500 bg-primary-50 text-primary-600"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 mr-3", isActive && "text-primary-500")} />
                  <span>{item.name}</span>
                </button>
              </li>
            );
          })}

          {/* Seção de Administração - apenas para administradores */}
          {user?.role === 'admin' && (
            <li className="mt-4 px-2">
              <button
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className={cn(
                  "flex items-center justify-between w-full px-4 py-3 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-md group transition-colors",
                  isAdminPage && "border-l-4 border-primary-500 bg-primary-50 text-primary-600",
                  "focus:outline-none"
                )}
              >
                <div className="flex items-center">
                  <Settings className={cn("h-5 w-5 mr-3", isAdminPage && "text-primary-500")} />
                  <span>Administração</span>
                </div>
                {adminMenuOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {adminMenuOpen && (
                <ul className="ml-4 mt-1">
                  <li className="mb-1">
                    <button
                      onClick={() => handleNavigateTo("/admin/usuarios")}
                      className={cn(
                        "flex items-center px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-md group transition-colors w-full text-left",
                        location === "/admin/usuarios" && "text-primary-600 bg-primary-50"
                      )}
                    >
                      <UserCog className={cn("h-4 w-4 mr-3", location === "/admin/usuarios" && "text-primary-500")} />
                      <span>Gerenciar Usuários</span>
                    </button>
                  </li>
                  <li className="mb-1">
                    <button
                      onClick={() => handleNavigateTo("/backup")}
                      className={cn(
                        "flex items-center px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-md group transition-colors w-full text-left",
                        location === "/backup" && "text-primary-600 bg-primary-50"
                      )}
                    >
                      <Database className={cn("h-4 w-4 mr-3", location === "/backup" && "text-primary-500")} />
                      <span>Backup e Restauração</span>
                    </button>
                  </li>
                  <li className="mb-1">
                    <button
                      onClick={() => handleNavigateTo("/configuracoes")}
                      className={cn(
                        "flex items-center px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-md group transition-colors w-full text-left",
                        location === "/configuracoes" && "text-primary-600 bg-primary-50"
                      )}
                    >
                      <Cog className={cn("h-4 w-4 mr-3", location === "/configuracoes" && "text-primary-500")} />
                      <span>Configurações</span>
                    </button>
                  </li>
                </ul>
              )}
            </li>
          )}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-neutral-200">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between px-3 hover:bg-primary-50">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary-100 text-primary-700">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium truncate max-w-[120px]">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-neutral-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => {
                  logoutMutation.mutate();
                  if (onNavigate) onNavigate();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => handleNavigateTo("/auth")}
          >
            Entrar
          </Button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
