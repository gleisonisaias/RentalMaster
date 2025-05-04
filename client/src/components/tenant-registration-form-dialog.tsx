import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TenantRegistrationFormPDF } from "./tenant-registration-form-pdf";

interface TenantRegistrationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: number;
}

export function TenantRegistrationFormDialog({
  isOpen,
  onClose,
  tenantId,
}: TenantRegistrationFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Ficha Cadastral do Inquilino</DialogTitle>
        </DialogHeader>
        
        <div className="mt-2 flex-1 overflow-hidden h-[70vh]">
          {isOpen && (
            <TenantRegistrationFormPDF 
              tenantId={tenantId} 
              onClose={onClose}
            />
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button 
            onClick={() => {
              setIsLoading(true);
              // Abrir a ficha cadastral em uma nova aba
              window.open(`/api/tenants/${tenantId}/registration-form`, "_blank");
              setIsLoading(false);
            }}
          >
            {isLoading ? "Gerando..." : "Baixar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}