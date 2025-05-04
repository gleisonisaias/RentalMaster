import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, FileText, FileCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Contract, Owner, Property, Tenant, ContractTemplate } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ContractPDFDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: number;
}

export const ContractPDFDialog = ({ isOpen, onClose, contractId }: ContractPDFDialogProps) => {
  const [contractType, setContractType] = useState<"residential" | "commercial">("residential");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("template");

  // Buscar dados do contrato
  const { data: contract, isLoading: isLoadingContract } = useQuery({
    queryKey: ['/api/contracts', contractId],
    queryFn: async () => {
      const response = await fetch(`/api/contracts/${contractId}`);
      if (!response.ok) throw new Error("Erro ao buscar contrato");
      return response.json();
    },
    enabled: isOpen && !!contractId,
  });

  // Buscar dados do proprietário
  const { data: owner, isLoading: isLoadingOwner } = useQuery({
    queryKey: ['/api/owners', contract?.ownerId],
    queryFn: async () => {
      const response = await fetch(`/api/owners/${contract.ownerId}`);
      if (!response.ok) throw new Error("Erro ao buscar proprietário");
      return response.json();
    },
    enabled: isOpen && !!contract?.ownerId,
  });

  // Buscar dados do inquilino
  const { data: tenant, isLoading: isLoadingTenant } = useQuery({
    queryKey: ['/api/tenants', contract?.tenantId],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${contract.tenantId}`);
      if (!response.ok) throw new Error("Erro ao buscar inquilino");
      return response.json();
    },
    enabled: isOpen && !!contract?.tenantId,
  });

  // Buscar dados do imóvel
  const { data: property, isLoading: isLoadingProperty } = useQuery({
    queryKey: ['/api/properties', contract?.propertyId],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${contract.propertyId}`);
      if (!response.ok) throw new Error("Erro ao buscar imóvel");
      return response.json();
    },
    enabled: isOpen && !!contract?.propertyId,
  });

  // Buscar modelos de contrato disponíveis
  const { data: templates, isLoading: isLoadingTemplates } = useQuery<ContractTemplate[]>({
    queryKey: ['/api/contract-templates'],
    queryFn: async () => {
      const response = await fetch('/api/contract-templates');
      if (!response.ok) throw new Error("Erro ao buscar modelos de contrato");
      return response.json();
    },
    enabled: isOpen
  });

  // Filtrar modelos pelo tipo selecionado (residencial ou comercial)
  const filteredTemplates = templates?.filter(template => 
    template.isActive && template.type === contractType
  ) || [];

  // Limpar a seleção do modelo quando o tipo de contrato muda
  useEffect(() => {
    setSelectedTemplateId("");
  }, [contractType]);

  const isLoading = isLoadingContract || isLoadingOwner || isLoadingTenant || 
                   isLoadingProperty || isLoadingTemplates;

  const handlePreviewContract = () => {
    if (!contract) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados necessários para gerar o contrato.",
        variant: "destructive",
      });
      return;
    }

    // Determinar o tipo de contrato a ser gerado
    const contractUrlType = contractType === "residential" ? "residential" : "commercial";
    
    // Montar a URL do endpoint com parâmetros de consulta para o modelo, se aplicável
    let previewUrl = `/api/contracts/${contractId}/preview/${contractUrlType}`;
    
    // Se estiver usando um modelo personalizado e tiver um ID selecionado
    if (activeTab === "template" && useTemplate && selectedTemplateId) {
      previewUrl += `?templateId=${selectedTemplateId}`;
    }
    
    // Abrir uma nova aba com a visualização prévia
    window.open(previewUrl, '_blank');
    
    // Fechar o diálogo
    onClose();
  };

  // Estado para controlar o formato de saída do documento (PDF ou HTML)
  const [outputFormat, setOutputFormat] = useState<"pdf" | "html">("html");

  const handleDownloadPDF = async () => {
    if (!contract) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados necessários para gerar o contrato.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Determinar o tipo de contrato a ser gerado
      const contractTypeUrl = contractType === "residential" ? "residential" : "commercial";
      const format = outputFormat; // "pdf" ou "html"
      const fileName = contractType === "residential" 
        ? `contrato_residencial_${contractId}.${format}` 
        : `contrato_comercial_${contractId}.${format}`;
      
      // Montar a URL do endpoint com parâmetros de consulta para o modelo, se aplicável
      let apiUrl = `/api/contracts/${contractId}/${format}/${contractTypeUrl}`;
      
      // Se estiver usando um modelo personalizado e tiver um ID selecionado
      if (activeTab === "template" && useTemplate && selectedTemplateId) {
        apiUrl += `?templateId=${selectedTemplateId}`;
      }
      
      // Determinar o tipo MIME baseado no formato
      const acceptHeader = format === "pdf" ? "application/pdf" : "text/html";
      
      // Usar o endpoint do servidor para gerar o documento
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': acceptHeader,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erro na geração do documento: ${response.status} ${response.statusText}`);
      }
      
      // Se for formato HTML e o navegador suportar, abrir em nova aba em vez de baixar
      if (format === "html") {
        window.open(apiUrl, '_blank');
        toast({
          title: "Sucesso",
          description: "Contrato aberto em nova aba!",
        });
        onClose();
        setIsGenerating(false);
        return;
      }
      
      // Para PDF, continuar com o processo de download
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Criar um elemento <a> para download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      
      // Adicionar o link ao DOM, clicar nele e depois removê-lo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Liberar o URL do objeto
      window.URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Sucesso",
        description: "Contrato baixado com sucesso!",
      });

      onClose();
    } catch (error) {
      console.error(`Erro ao gerar ${outputFormat.toUpperCase()}:`, error);
      toast({
        title: "Erro",
        description: `Ocorreu um erro ao gerar o contrato em ${outputFormat.toUpperCase()}. Por favor, tente novamente.`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerar contrato</DialogTitle>
          <DialogDescription>
            Escolha o tipo de contrato, o formato de saída (PDF ou HTML) e as opções de formatação.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Carregando dados do contrato...</span>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Tipo de contrato</Label>
              <RadioGroup
                value={contractType}
                onValueChange={(value) => setContractType(value as "residential" | "commercial")}
                className="flex flex-col space-y-3"
              >
                <div className="flex items-center space-x-2 rounded-md border p-3 bg-card hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="residential" id="residential" className="mt-0" />
                  <Label htmlFor="residential" className="flex flex-col cursor-pointer flex-1">
                    <span className="font-medium">Contrato Residencial</span>
                    <span className="text-sm text-muted-foreground">
                      Para locação de imóveis residenciais.
                    </span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 rounded-md border p-3 bg-card hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="commercial" id="commercial" className="mt-0" />
                  <Label htmlFor="commercial" className="flex flex-col cursor-pointer flex-1">
                    <span className="font-medium">Contrato Comercial</span>
                    <span className="text-sm text-muted-foreground">
                      Para locação de imóveis comerciais.
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-2">
                <TabsTrigger value="standard" className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Padrão
                </TabsTrigger>
                <TabsTrigger value="template" className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Modelo personalizado
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="standard" className="pt-2">
                <div className="text-sm text-muted-foreground mb-4">
                  Será gerado um contrato com formato padrão do sistema.
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="outputFormat">Formato de saída</Label>
                  <RadioGroup
                    value={outputFormat}
                    onValueChange={(value) => setOutputFormat(value as "pdf" | "html")}
                    className="flex space-x-4"
                    id="outputFormat"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pdf" id="pdf" />
                      <Label htmlFor="pdf" className="cursor-pointer">
                        <span className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          PDF
                        </span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="html" id="html" />
                      <Label htmlFor="html" className="cursor-pointer">
                        <span className="flex items-center">
                          <FileCode className="w-4 h-4 mr-1" />
                          HTML
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-sm text-blue-600 mt-1">
                    {outputFormat === "html" ? 
                      "O formato HTML preserva melhor as formatações (negrito, cores, etc.) mas não é adequado para impressão." :
                      "O formato PDF é melhor para impressão, mas pode ter limitações na preservação de algumas formatações."}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="template" className="pt-2 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="useTemplate" 
                    checked={useTemplate}
                    onCheckedChange={(checked) => setUseTemplate(checked === true)}
                  />
                  <Label htmlFor="useTemplate">Usar modelo personalizado</Label>
                </div>
                
                {useTemplate && (
                  <div className="space-y-2">
                    <Label htmlFor="templateSelect">Selecione um modelo</Label>
                    <Select 
                      value={selectedTemplateId} 
                      onValueChange={setSelectedTemplateId}
                      disabled={filteredTemplates.length === 0}
                    >
                      <SelectTrigger id="templateSelect">
                        <SelectValue placeholder="Selecione um modelo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Modelos disponíveis</SelectLabel>
                          {filteredTemplates.length > 0 ? (
                            filteredTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                {template.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              Nenhum modelo disponível para este tipo
                            </SelectItem>
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {filteredTemplates.length === 0 && (
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                        Não há modelos ativos para o tipo de contrato selecionado.
                      </p>
                    )}
                    
                    <div className="mt-6 space-y-2">
                      <Label htmlFor="templateOutputFormat">Formato de saída</Label>
                      <RadioGroup
                        value={outputFormat}
                        onValueChange={(value) => setOutputFormat(value as "pdf" | "html")}
                        className="flex space-x-4"
                        id="templateOutputFormat"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pdf" id="template-pdf" />
                          <Label htmlFor="template-pdf" className="cursor-pointer">
                            <span className="flex items-center">
                              <FileText className="w-4 h-4 mr-1" />
                              PDF
                            </span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="html" id="template-html" />
                          <Label htmlFor="template-html" className="cursor-pointer">
                            <span className="flex items-center">
                              <FileCode className="w-4 h-4 mr-1" />
                              HTML
                            </span>
                          </Label>
                        </div>
                      </RadioGroup>
                      <p className="text-sm text-blue-600 mt-1">
                        {outputFormat === "html" ? 
                          "O formato HTML preserva melhor as formatações (negrito, cores, etc.) mas não é adequado para impressão." :
                          "O formato PDF é melhor para impressão, mas pode ter limitações na preservação de algumas formatações."}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isGenerating} className="flex-1 sm:flex-initial">
            Cancelar
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isLoading || isGenerating || (activeTab === "template" && useTemplate && !selectedTemplateId)}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                {outputFormat === "pdf" ? (
                  <FileText className="mr-2 h-4 w-4" />
                ) : (
                  <FileCode className="mr-2 h-4 w-4" />
                )}
                {outputFormat === "pdf" ? "Baixar PDF" : "Abrir em HTML"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};