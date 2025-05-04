import { useRef, useState } from "react";
import { Bell, LogOut, User, Settings, AlertTriangle, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onLogout?: () => void;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

const Header = ({ onLogout, onMobileMenuToggle, isMobileMenuOpen }: HeaderProps) => {
  const { user, logoutMutation } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  // Obter as iniciais do nome do usuário
  const getInitials = () => {
    if (!user || !user.name) return "U";
    
    const nameParts = user.name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (
      nameParts[0].charAt(0).toUpperCase() + 
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };
  
  // Função para abrir diálogo de confirmação de logout
  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };
  
  // Função para executar o logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      <header className="bg-white border-b border-neutral-200 shadow-sm flex items-center justify-between p-4 md:py-2 z-10">
        <div className="md:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-neutral-700 hover:text-primary-500"
            onClick={onMobileMenuToggle}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
            <span className="sr-only">
              {isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            </span>
          </Button>
        </div>
        
        <div className="flex-1 md:flex-none text-center md:text-left md:ml-0">
          <h1 className="text-xl font-semibold text-neutral-800 md:hidden">ImovelGest</h1>
        </div>
        
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="relative rounded-full text-neutral-700 hover:text-primary-500"
          >
            <Bell className="h-6 w-6" />
            <span className="sr-only">Notificações</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2">
                <Avatar className="h-8 w-8 bg-primary-100 text-primary-700 cursor-pointer">
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuGroup>
                {user && (
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogoutClick}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      {/* Diálogo de confirmação para logout */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar saída
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você realmente deseja sair do sistema? 
              {user?.role === "admin" && (
                " Considere fazer backup dos dados antes de sair."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Sair do sistema
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Header;
