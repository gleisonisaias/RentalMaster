import { useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Download } from "lucide-react";

interface ExitConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ExitConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
}: ExitConfirmationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupCreated, setBackupCreated] = useState(false);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const handleCreateBackup = async () => {
    if (!user || user.role !== "admin") {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem criar backups do sistema",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingBackup(true);
      
      // Criar e baixar o backup
      const response = await apiRequest("GET", "/api/admin/backup");
      
      // Criar URL para download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Criar nome de arquivo com data atual
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `backup-sistema-${date}.json`;
      
      // Iniciar download através de um link temporário
      if (downloadLinkRef.current) {
        downloadLinkRef.current.href = url;
        downloadLinkRef.current.download = fileName;
        downloadLinkRef.current.click();
      }
      
      setBackupCreated(true);
      
      toast({
        title: "Backup criado com sucesso",
        description: "O download do arquivo de backup foi iniciado",
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao criar backup:", error);
      toast({
        title: "Erro ao criar backup",
        description: "Ocorreu um erro ao tentar criar o backup do sistema",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sair do sistema</DialogTitle>
          <DialogDescription>
            Deseja criar um backup do sistema antes de sair?
            {user?.role === "admin" ? (
              " Como administrador, você pode fazer o backup completo do sistema."
            ) : (
              " Apenas administradores podem criar backups completos do sistema."
            )}
          </DialogDescription>
        </DialogHeader>
        
        {/* Link invisível para download */}
        <a ref={downloadLinkRef} className="hidden" />
        
        <div className="flex flex-col space-y-4 py-4">
          {isCreatingBackup && (
            <div className="flex items-center justify-center space-x-2 p-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Criando backup...</span>
            </div>
          )}
          
          {backupCreated && (
            <div className="flex items-center space-x-2 text-green-600 p-2 bg-green-50 rounded-md">
              <CheckCircle2 className="h-5 w-5" />
              <span>Backup criado com sucesso!</span>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-row justify-between sm:justify-between">
          <div>
            {user?.role === "admin" && !backupCreated && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="mr-2"
              >
                {isCreatingBackup ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Criar backup
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={onConfirm}
              disabled={isCreatingBackup}
            >
              Sair
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExitConfirmationDialog;