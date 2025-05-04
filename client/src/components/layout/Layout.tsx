import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ExitConfirmationDialog from "../exit-confirmation-dialog";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Função para confirmar saída e redirecionar para a página de login
  const handleConfirmExit = () => {
    // Redirecionar para a página de login
    window.location.href = "/auth";
  };
  
  // Adicionar evento ao tentar fechar a janela
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Para browsers modernos
      e.preventDefault();
      // Para browsers antigos
      e.returnValue = '';
      return '';
    };
    
    // Detectar quando o usuário tenta fechar a janela ou navegar para fora do site
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Adicionar listener para fechar o menu mobile ao clicar em um link
  // ou quando a tela for redimensionada para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint no Tailwind
        setIsMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Função para fechar o menu móvel
  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar visível apenas em desktop (md:block) ou quando menu mobile estiver aberto */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block absolute md:relative z-20 h-full`}>
        <Sidebar onNavigate={handleCloseMobileMenu} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onLogout={() => setShowExitConfirmation(true)} 
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50">
          {children}
        </main>
      </div>
      
      {/* Overlay escuro para quando o menu mobile estiver aberto */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={handleCloseMobileMenu}
        />
      )}
      
      {/* Diálogo de confirmação de saída */}
      <ExitConfirmationDialog 
        isOpen={showExitConfirmation}
        onClose={() => setShowExitConfirmation(false)}
        onConfirm={handleConfirmExit}
      />
    </div>
  );
};

export default Layout;
