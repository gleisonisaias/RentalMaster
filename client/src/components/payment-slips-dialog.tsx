import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/utils/formatters";

interface PaymentSlipsDialogProps {
  contractId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentSlipsDialog: React.FC<PaymentSlipsDialogProps> = ({
  contractId,
  isOpen,
  onClose,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Buscar dados do contrato e pagamentos relacionados
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/contracts/${contractId}/payment-slips-data`],
    queryFn: async () => {
      const response = await fetch(`/api/contracts/${contractId}/payment-slips-data`);
      if (!response.ok) {
        throw new Error("Erro ao carregar dados para carnês");
      }
      return response.json();
    },
    enabled: isOpen && !!contractId,
  });

  const handleGenerateSlips = async () => {
    if (!data || !data.contract) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados necessários para gerar os carnês.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Usar o endpoint do servidor para gerar o PDF dos carnês
      const response = await fetch(`/api/contracts/${contractId}/payment-slips`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erro na geração dos carnês: ${response.status} ${response.statusText}`);
      }
      
      // Obter o blob do PDF
      const pdfBlob = await response.blob();
      
      // Criar um URL para o blob
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Criar um elemento <a> para download
      const link = document.createElement('a');
      link.href = url;
      link.download = `carnes_contrato_${contractId}.pdf`;
      
      // Adicionar o link ao DOM, clicar nele e depois removê-lo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Liberar o URL do objeto
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Sucesso",
        description: "Carnês gerados com sucesso!",
      });

      onClose();
    } catch (error) {
      console.error("Erro ao gerar carnês:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao gerar os carnês. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerar Carnês de Pagamento</DialogTitle>
          <DialogDescription>
            Serão gerados carnês para todas as parcelas do contrato.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <span>Carregando dados do contrato...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-destructive">Erro ao carregar dados do contrato.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Por favor, tente novamente mais tarde.
            </p>
          </div>
        ) : !data || !data.contract || !data.payments || !data.owner || !data.tenant || !data.property ? (
          <div className="p-6 text-center">
            <p className="text-destructive">Dados incompletos ou indisponíveis.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Não foi possível carregar todos os dados necessários para gerar os carnês.
            </p>
          </div>
        ) : (
          <div className="py-4">
            <div className="mb-4 p-4 bg-muted rounded-md">
              <h3 className="font-medium mb-2">Detalhes do Contrato</h3>
              <p><span className="font-semibold">Contrato Nº:</span> {data.contract.id}</p>
              <p><span className="font-semibold">Inquilino:</span> {data.tenant.name}</p>
              <p><span className="font-semibold">Proprietário:</span> {data.owner.name}</p>
              <p><span className="font-semibold">Valor:</span> {formatCurrency(data.contract.rentValue)}</p>
              <p><span className="font-semibold">Duração:</span> {data.contract.duration} meses</p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-medium mb-2">Parcelas a serem incluídas ({data.payments.length})</h3>
              <div className="max-h-48 overflow-y-auto p-2 border rounded-md">
                {data.payments.map((payment: any, index: number) => (
                  <div key={payment.id} className="flex justify-between items-center py-1 border-b last:border-b-0">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{formatDate(payment.dueDate)}</span>
                    </div>
                    <span>{formatCurrency(payment.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerateSlips} 
            disabled={isLoading || isGenerating || !data || !data.contract}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              "Gerar Carnês"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};