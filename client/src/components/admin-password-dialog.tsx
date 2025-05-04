import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert } from "lucide-react";

interface AdminPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (adminPassword: string) => void;
  isLoading: boolean;
  title: string;
  description: string;
}

export function AdminPasswordDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  title,
  description,
}: AdminPasswordDialogProps) {
  const [password, setPassword] = useState("");
  
  const handleConfirm = () => {
    onConfirm(password);
  };
  
  // Manipular a tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && password.trim()) {
      e.preventDefault();
      handleConfirm();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto bg-amber-100 p-3 rounded-full">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Label htmlFor="admin-password" className="block mb-2 text-sm font-medium">
            Senha do Administrador
          </Label>
          <Input
            id="admin-password"
            type="password"
            placeholder="Digite a senha do administrador"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="new-password"
            className="mt-1"
            autoFocus
          />
        </div>
        
        <DialogFooter className="sm:justify-center sm:space-x-4 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isLoading || !password.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}