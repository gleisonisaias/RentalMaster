import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RenewalPDFButtonProps {
  renewalId: number;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  customClass?: string;
  title?: string;
  iconsOnly?: boolean;
}

export function RenewalPDFButton({ 
  renewalId, 
  size = "default", 
  variant = "default", 
  customClass = "",
  title = "Baixar Termo Aditivo",
  iconsOnly = false
}: RenewalPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGeneratePDF = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      const fileName = `termo_aditivo_${renewalId}.pdf`;
      
      // Usar o endpoint do servidor para gerar o PDF
      // Verifica se estamos usando o ID do contrato ou da renovação
      const endpoint = Number.isInteger(renewalId) && renewalId > 0
        ? `/api/contract-renewals/by-contract/${renewalId}/pdf` // Usa o ID do contrato
        : `/api/contract-renewals/${renewalId}/pdf`;            // Usa o ID da renovação
      
      console.log(`Gerando PDF para o termo aditivo usando endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erro na geração do PDF: ${response.status} ${response.statusText}`);
      }
      
      // Obter o blob do PDF
      const pdfBlob = await response.blob();
      
      // Criar um URL para o blob
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Criar um elemento <a> para download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Adicionar o link ao DOM, clicar nele e depois removê-lo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Liberar o URL do objeto
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Sucesso",
        description: "Termo Aditivo gerado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao gerar o termo aditivo. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={handleGeneratePDF} 
      variant={variant} 
      size={size} 
      className={`flex items-center ${customClass}`} 
      disabled={isGenerating}
      title={title}
    >
      <FileIcon className={iconsOnly ? "h-4 w-4" : "mr-2 h-4 w-4"} />
      {isGenerating ? 
        (iconsOnly ? null : "Gerando...") : 
        (iconsOnly ? null : "Baixar Termo Aditivo")
      }
    </Button>
  );
}