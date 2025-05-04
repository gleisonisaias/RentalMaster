import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ContractTemplate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Save,
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  Image,
  Table,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Plus
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Schema de validação para o formulário
const templateFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  type: z.enum(["residential", "commercial"], {
    required_error: "Selecione o tipo de contrato",
  }),
  content: z.string().min(50, "O conteúdo deve ter pelo menos 50 caracteres"),
  isActive: z.boolean().default(true),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface ContractTemplateEditorProps {
  initialData?: ContractTemplate;
  templateId?: number;
  onSuccess?: () => void;
}

export function ContractTemplateEditor({
  initialData,
  templateId,
  onSuccess,
}: ContractTemplateEditorProps) {
  const { toast } = useToast();
  
  // Estados para controlar o colapso de cada seção - inicialmente todas fechadas
  const [ownerSectionOpen, setOwnerSectionOpen] = useState(false);
  const [propertySectionOpen, setPropertySectionOpen] = useState(false);
  const [tenantSectionOpen, setTenantSectionOpen] = useState(false);
  const [contractSectionOpen, setContractSectionOpen] = useState(false);
  const [specialSectionOpen, setSpecialSectionOpen] = useState(false);
  const [allSectionsOpen, setAllSectionsOpen] = useState(false);
  const [fullscreenEditorOpen, setFullscreenEditorOpen] = useState(false);
  const [fontSize, setFontSize] = useState("12");
  
  // Função para mostrar/ocultar todas as seções
  const toggleAllSections = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevenir o comportamento padrão
    e.stopPropagation(); // Impedir que o evento se propague
    const newState = !allSectionsOpen;
    setAllSectionsOpen(newState);
    setOwnerSectionOpen(newState);
    setPropertySectionOpen(newState);
    setTenantSectionOpen(newState);
    setContractSectionOpen(newState);
    setSpecialSectionOpen(newState);
  };

  // Inicializar o formulário com os dados do modelo, se fornecidos
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          type: initialData.type as "residential" | "commercial",
          content: initialData.content,
          isActive: initialData.isActive === null ? true : !!initialData.isActive,
        }
      : {
          name: "",
          type: "residential",
          content: "",
          isActive: true,
        },
  });

  // Mutação para criar ou atualizar um modelo
  const saveMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      if (templateId) {
        // Atualizar modelo existente
        await apiRequest("PATCH", `/api/contract-templates/${templateId}`, data);
      } else {
        // Criar novo modelo
        await apiRequest("POST", "/api/contract-templates", data);
      }
    },
    onSuccess: () => {
      toast({
        title: templateId ? "Modelo atualizado" : "Modelo criado",
        description: templateId
          ? "O modelo foi atualizado com sucesso."
          : "O modelo foi criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contract-templates"] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar modelo",
        description: error.message || "Ocorreu um erro ao salvar o modelo.",
        variant: "destructive",
      });
    },
  });

  // Função para lidar com o envio do formulário
  const onSubmit = (values: TemplateFormValues) => {
    saveMutation.mutate(values);
  };

  // Variáveis para o conteúdo de exemplo
  const placeholders = {
    residential: 
`<div class="header">
CONTRATO DE LOCAÇÃO RESIDENCIAL
</div>

LOCADOR: {{owner.name}}, {{owner.nationality}}, {{owner.maritalStatus}}, portador(a) do CPF nº {{owner.document}}, residente e domiciliado(a) em {{owner.address}}.

LOCATÁRIO: {{tenant.name}}, {{tenant.nationality}}, {{tenant.maritalStatus}}, portador(a) do CPF nº {{tenant.document}}, residente e domiciliado(a) em {{tenant.address}}.

IMÓVEL: {{property.address}}, com área de {{property.area}}m².

CLÁUSULA PRIMEIRA - PRAZO
O prazo da locação é de {{contract.duration}} meses, iniciando-se em {{contract.startDate}} e terminando em {{contract.endDate}}, data em que o LOCATÁRIO se obriga a restituir o imóvel desocupado.

CLÁUSULA SEGUNDA - VALOR DO ALUGUEL
O valor do aluguel mensal é de R$ {{contract.rentValue}}, a ser pago até o dia {{contract.paymentDay}} de cada mês.

CLÁUSULA TERCEIRA - OBRIGAÇÕES DO LOCATÁRIO
...

<div class="footer">
(Local e data)

_______________________________               _______________________________
         LOCADOR                                        LOCATÁRIO
</div>
`,
    commercial: 
`<div class="header">
CONTRATO DE LOCAÇÃO COMERCIAL
</div>

LOCADOR: {{owner.name}}, inscrito(a) no CPF sob o nº {{owner.document}}, com endereço em {{owner.address}}.

LOCATÁRIO: {{tenant.name}}, inscrito(a) no CPF/CNPJ sob o nº {{tenant.document}}, com endereço em {{tenant.address}}.

IMÓVEL COMERCIAL: {{property.address}}, com área de {{property.area}}m².

CLÁUSULA PRIMEIRA - OBJETO E FINALIDADE
O LOCADOR cede ao LOCATÁRIO o imóvel acima descrito, para fins exclusivamente comerciais, para a atividade de: _______________.

CLÁUSULA SEGUNDA - PRAZO
A presente locação terá o prazo de {{contract.duration}} meses, com início em {{contract.startDate}} e término em {{contract.endDate}}.

CLÁUSULA TERCEIRA - VALOR E FORMA DE PAGAMENTO
O valor do aluguel mensal é de R$ {{contract.rentValue}}, a ser pago até o dia {{contract.paymentDay}} de cada mês.

CLÁUSULA QUARTA - REAJUSTE
...

<div class="footer">
(Local e data)

_______________________________               _______________________________
         LOCADOR                                        LOCATÁRIO
</div>
`,
  };

  // Função para inserir placeholders no campo de conteúdo
  const insertPlaceholder = (placeholder: string, event?: React.MouseEvent) => {
    // Evitar propagação e comportamento padrão para não fechar o popup
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const textarea = textareaRef.current;
    const currentContent = form.getValues("content");
    
    if (textarea) {
      textarea.focus();
      const startPos = textarea.selectionStart || 0;
      const endPos = textarea.selectionEnd || 0;
      
      const newContent = 
        currentContent.substring(0, startPos) + 
        placeholder + 
        currentContent.substring(endPos);
      
      form.setValue("content", newContent, { shouldValidate: true });
      
      // Posicionar o cursor após o placeholder inserido
      const newCursorPos = startPos + placeholder.length;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      // Se a referência do textarea não existir, adiciona ao final
      form.setValue("content", currentContent + placeholder, { shouldValidate: true });
    }
  };
  
  // Função para copiar placeholder para área de transferência
  const copyPlaceholder = (placeholder: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard.writeText(placeholder)
      .then(() => {
        toast({
          title: "Copiado!",
          description: `"${placeholder}" copiado para a área de transferência.`,
          duration: 2000,
        });
      })
      .catch(err => {
        console.error('Erro ao copiar: ', err);
      });
  };

  // Função para carregar conteúdo de exemplo para o tipo de contrato selecionado
  const loadExampleContent = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const currentType = form.getValues("type");
    form.setValue("content", placeholders[currentType], { shouldValidate: true });
  };

  // Referência para o textarea
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Funções para formatação de texto
  const applyFormatting = (command: string, value?: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const currentContent = form.getValues("content");
    
    let newContent = currentContent;
    let newCursorPos = end;
    
    switch (command) {
      case 'bold':
        newContent = currentContent.substring(0, start) + 
                     `<b>${selectedText}</b>` + 
                     currentContent.substring(end);
        newCursorPos = end + 7;
        break;
      case 'italic':
        newContent = currentContent.substring(0, start) + 
                     `<i>${selectedText}</i>` + 
                     currentContent.substring(end);
        newCursorPos = end + 7;
        break;
      case 'underline':
        newContent = currentContent.substring(0, start) + 
                     `<u>${selectedText}</u>` + 
                     currentContent.substring(end);
        newCursorPos = end + 7;
        break;
      case 'align-left':
        newContent = currentContent.substring(0, start) + 
                     `<div style="text-align: left;">${selectedText}</div>` + 
                     currentContent.substring(end);
        newCursorPos = end + 34;
        break;
      case 'align-center':
        newContent = currentContent.substring(0, start) + 
                     `<div style="text-align: center;">${selectedText}</div>` + 
                     currentContent.substring(end);
        newCursorPos = end + 36;
        break;
      case 'align-right':
        newContent = currentContent.substring(0, start) + 
                     `<div style="text-align: right;">${selectedText}</div>` + 
                     currentContent.substring(end);
        newCursorPos = end + 35;
        break;
      case 'align-justify':
        newContent = currentContent.substring(0, start) + 
                     `<div style="text-align: justify;">${selectedText}</div>` + 
                     currentContent.substring(end);
        newCursorPos = end + 37;
        break;
      case 'list-ul':
        // Aplicar uma lista não ordenada para cada linha
        const ulLines = selectedText.split('\n').map(line => `• ${line.trim()}`).join('\n');
        newContent = currentContent.substring(0, start) + ulLines + currentContent.substring(end);
        newCursorPos = start + ulLines.length;
        break;
      case 'list-ol':
        // Aplicar uma lista ordenada para cada linha
        const olLines = selectedText.split('\n').map((line, index) => `${index + 1}. ${line.trim()}`).join('\n');
        newContent = currentContent.substring(0, start) + olLines + currentContent.substring(end);
        newCursorPos = start + olLines.length;
        break;
      case 'header':
        if (value) {
          const hashes = '#'.repeat(parseInt(value));
          newContent = currentContent.substring(0, start) + 
                      `${hashes} ${selectedText}` + 
                      currentContent.substring(end);
          newCursorPos = end + hashes.length + 1;
        }
        break;
      case 'link':
        newContent = currentContent.substring(0, start) + 
                     `[${selectedText}](URL)` + 
                     currentContent.substring(end);
        newCursorPos = end + 7;
        break;
      case 'table':
        // Inserir uma tabela simples
        const tableTemplate = `
| Coluna 1 | Coluna 2 | Coluna 3 |
|----------|----------|----------|
| Dado 1   | Dado 2   | Dado 3   |
| Dado 4   | Dado 5   | Dado 6   |
`;
        newContent = currentContent.substring(0, start) + tableTemplate + currentContent.substring(end);
        newCursorPos = start + tableTemplate.length;
        break;
        
      case 'font-size':
        // Aplicar tamanho de fonte ao texto selecionado
        if (value) {
          newContent = currentContent.substring(0, start) + 
                     `<span style="font-size: ${value}px;">${selectedText}</span>` + 
                     currentContent.substring(end);
          newCursorPos = end + 25 + value.length;
        }
        break;
    }
    
    form.setValue("content", newContent, { shouldValidate: true });
    
    // Restaurar o foco e a posição do cursor após a edição
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Atualizar o conteúdo quando o tipo de contrato mudar
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "type" && !form.getValues("content")) {
        const currentType = form.getValues("type");
        form.setValue("content", placeholders[currentType], { shouldValidate: true });
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, placeholders]);

  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nome do Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do modelo de contrato" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Contrato</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="residential">Residencial</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center mb-2">
                  <FormLabel className="text-lg">Conteúdo do Modelo</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => loadExampleContent(e)}
                  >
                    Carregar Exemplo
                  </Button>
                </div>
                
                {/* Barra de formatação do texto */}
                <div className="flex items-center border rounded-md p-1 mb-2 bg-muted/20">
                  <TooltipProvider>
                    <div className="flex items-center space-x-1 border-r pr-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => applyFormatting('bold', undefined, e)}
                          >
                            <Bold className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Negrito</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => applyFormatting('italic', undefined, e)}
                          >
                            <Italic className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Itálico</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => applyFormatting('underline', undefined, e)}
                          >
                            <Underline className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Sublinhado</TooltipContent>
                      </Tooltip>
                    </div>
                    
                    {/* Seletor de tamanho de fonte */}
                    <div className="flex items-center space-x-1 px-1 border-r">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Select 
                            value={fontSize} 
                            onValueChange={(value) => {
                              setFontSize(value);
                              const selectedText = textareaRef.current?.value.substring(
                                textareaRef.current.selectionStart || 0, 
                                textareaRef.current.selectionEnd || 0
                              ) || '';
                              
                              if (selectedText) {
                                applyFormatting('font-size', value, undefined);
                              }
                            }}
                          >
                            <SelectTrigger className="w-[70px] h-8">
                              <SelectValue placeholder="Fonte" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10px</SelectItem>
                              <SelectItem value="12">12px</SelectItem>
                              <SelectItem value="14">14px</SelectItem>
                              <SelectItem value="16">16px</SelectItem>
                              <SelectItem value="18">18px</SelectItem>
                              <SelectItem value="20">20px</SelectItem>
                              <SelectItem value="24">24px</SelectItem>
                              <SelectItem value="36">36px</SelectItem>
                              <SelectItem value="48">48px</SelectItem>
                              <SelectItem value="72">72px</SelectItem>
                            </SelectContent>
                          </Select>
                        </TooltipTrigger>
                        <TooltipContent>Tamanho da fonte</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center space-x-1 px-1 border-r">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => applyFormatting('align-left', undefined, e)}
                          >
                            <AlignLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Alinhar à esquerda</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => applyFormatting('align-center', undefined, e)}
                          >
                            <AlignCenter className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Centralizar</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => applyFormatting('align-right', undefined, e)}
                          >
                            <AlignRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Alinhar à direita</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => applyFormatting('align-justify', undefined, e)}
                          >
                            <AlignJustify className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Justificar</TooltipContent>
                      </Tooltip>
                    </div>
                    
                    <div className="flex items-center space-x-1 px-1 border-r">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => applyFormatting('list-ul', undefined, e)}
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Lista com marcadores</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => applyFormatting('list-ol', undefined, e)}
                          >
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Lista numerada</TooltipContent>
                      </Tooltip>
                    </div>
                    
                    <div className="flex items-center space-x-1 px-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => applyFormatting('table', undefined, e)}
                          >
                            <Table className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Inserir tabela</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={(e) => applyFormatting('link', undefined, e)}
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Inserir link</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </div>
                
                {/* Colunas de variáveis clicáveis */}
                {/* Botão para mostrar/ocultar todas as tags */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium">Variáveis Disponíveis</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => toggleAllSections(e)}
                    className="flex items-center gap-1 text-xs"
                  >
                    {allSectionsOpen ? (
                      <>
                        <ChevronUp size={14} />
                        <span>Ocultar Todas</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        <span>Mostrar Todas</span>
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    {/* Seção de Proprietário com toggle */}
                    <div className="mb-4 border rounded-md overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-3 bg-muted/40 cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOwnerSectionOpen(!ownerSectionOpen);
                        }}
                      >
                        <h3 className="text-sm font-semibold">Proprietário</h3>
                        <Button type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="p-0 h-6 w-6"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOwnerSectionOpen(!ownerSectionOpen);
                          }}
                        >
                          {ownerSectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </Button>
                      </div>
                      
                      {ownerSectionOpen && (
                        <div className="grid grid-cols-1 gap-2 text-sm p-3">
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Nome do Proprietário</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{owner.name}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{owner.name}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{owner.name}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>CPF do Proprietário</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{owner.document}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{owner.document}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{owner.document}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Endereço do Proprietário</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{owner.address}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{owner.address}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{owner.address}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Telefone do Proprietário</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{owner.phone}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{owner.phone}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{owner.phone}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Email do Proprietário</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{owner.email}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{owner.email}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{owner.email}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Nacionalidade do Proprietário</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{owner.nationality}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{owner.nationality}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{owner.nationality}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Seção de Imóvel com toggle */}
                    <div className="mb-4 border rounded-md overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-3 bg-muted/40 cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPropertySectionOpen(!propertySectionOpen);
                        }}
                      >
                        <h3 className="text-sm font-semibold">Imóvel</h3>
                        <Button type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="p-0 h-6 w-6"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPropertySectionOpen(!propertySectionOpen);
                          }}
                        >
                          {propertySectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </Button>
                      </div>
                      
                      {propertySectionOpen && (
                        <div className="grid grid-cols-1 gap-2 text-sm p-3">
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Endereço do Imóvel</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{property.address}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{property.address}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{property.address}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Tipo do Imóvel</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{property.type}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{property.type}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{property.type}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Área do Imóvel (m²)</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{property.area}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{property.area}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{property.area}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Número de Quartos</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{property.bedrooms}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{property.bedrooms}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{property.bedrooms}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {/* Seção de Inquilino com toggle */}
                    <div className="mb-4 border rounded-md overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-3 bg-muted/40 cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTenantSectionOpen(!tenantSectionOpen);
                        }}
                      >
                        <h3 className="text-sm font-semibold">Inquilino</h3>
                        <Button type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="p-0 h-6 w-6"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTenantSectionOpen(!tenantSectionOpen);
                          }}
                        >
                          {tenantSectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </Button>
                      </div>
                      
                      {tenantSectionOpen && (
                        <div className="grid grid-cols-1 gap-2 text-sm p-3">
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Nome do Inquilino</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{tenant.name}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{tenant.name}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{tenant.name}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>CPF do Inquilino</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{tenant.document}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{tenant.document}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{tenant.document}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Endereço do Inquilino</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{tenant.address}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{tenant.address}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{tenant.address}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Telefone do Inquilino</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{tenant.phone}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{tenant.phone}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{tenant.phone}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Email do Inquilino</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{tenant.email}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{tenant.email}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{tenant.email}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Nacionalidade do Inquilino</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{tenant.nationality}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{tenant.nationality}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{tenant.nationality}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Seção de Contrato com toggle */}
                    <div className="mb-4 border rounded-md overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-3 bg-muted/40 cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContractSectionOpen(!contractSectionOpen);
                        }}
                      >
                        <h3 className="text-sm font-semibold">Contrato</h3>
                        <Button type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="p-0 h-6 w-6"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContractSectionOpen(!contractSectionOpen);
                          }}
                        >
                          {contractSectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </Button>
                      </div>
                      
                      {contractSectionOpen && (
                        <div className="grid grid-cols-1 gap-2 text-sm p-3">
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Data de Início</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{contract.startDate}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{contract.startDate}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{contract.startDate}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Data de Término</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{contract.endDate}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{contract.endDate}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{contract.endDate}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Duração (meses)</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{contract.duration}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{contract.duration}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{contract.duration}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Valor do Aluguel</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{contract.rentValue}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => copyPlaceholder("{{contract.rentValue}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </Button>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{contract.rentValue}}", e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Seção de Elementos Dinâmicos com toggle */}
                    <div className="mb-4 border rounded-md overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-3 bg-muted/40 cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSpecialSectionOpen(!specialSectionOpen);
                        }}
                      >
                        <h3 className="text-sm font-semibold">Elementos Dinâmicos</h3>
                        <Button type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="p-0 h-6 w-6"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSpecialSectionOpen(!specialSectionOpen);
                          }}
                        >
                          {specialSectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </Button>
                      </div>
                      
                      {specialSectionOpen && (
                        <div className="grid grid-cols-1 gap-2 text-sm p-3">
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Data e Hora Atual</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{DATA_ATUAL}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{DATA_ATUAL}}", e)}
                              >
                                <Plus size={14} />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Data Curta (DD/MM/AAAA)</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{DATA_CURTA}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{DATA_CURTA}}", e)}
                              >
                                <Plus size={14} />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Data Longa (DD de Mês de AAAA)</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{DATA_LONGA}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{DATA_LONGA}}", e)}
                              >
                                <Plus size={14} />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Hora (HH:MM)</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{HORA}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{HORA}}", e)}
                              >
                                <Plus size={14} />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between border rounded-md p-2 hover:bg-muted">
                            <span>Número da Página</span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-muted p-1 rounded">{"{{PAGINA}}"}</code>
                              <Button type="button" 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6" 
                                onClick={(e) => insertPlaceholder("{{PAGINA}}", e)}
                              >
                                <Plus size={14} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>



                <div className="flex justify-end items-center mb-2">
                  <div className="flex items-center space-x-2">
                    {/* Barra de ferramentas de formatação agora ao lado do botão de tela cheia */}
                    <div className="flex bg-muted/30 p-1 rounded-md border">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={(e) => applyFormatting('bold', undefined, e)}
                            >
                              <Bold className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Negrito</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={(e) => applyFormatting('italic', undefined, e)}
                            >
                              <Italic className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Itálico</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={(e) => applyFormatting('underline', undefined, e)}
                            >
                              <Underline className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Sublinhado</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    {/* Botão para edição em tela cheia */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFullscreenEditorOpen(true)}
                      className="flex items-center gap-1"
                    >
                      <Maximize2 size={14} />
                      <span>Tela Cheia</span>
                    </Button>
                  </div>
                </div>
                
                <FormControl>
                  <Textarea
                    {...field}
                    ref={textareaRef}
                    placeholder="Digite o conteúdo do modelo de contrato aqui..."
                    className="font-mono h-[400px] resize-none"
                  />
                </FormControl>
                <FormMessage />
                
                {/* Modal para edição em tela cheia */}
                {/* Editor inline em vez de Dialog */}
                {fullscreenEditorOpen && (
                  <div className="fixed inset-0 z-50 bg-background/95 flex flex-col p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">Editor em Tela Cheia</h2>
                      <Button type="button" 
                        variant="outline" 
                        onClick={() => setFullscreenEditorOpen(false)}
                        className="flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        <span>Fechar</span>
                      </Button>
                    </div>
                    
                    <div className="flex-1 flex flex-col bg-card rounded-lg shadow-lg overflow-hidden border border-border">
                      {/* Barra de formatação do texto */}
                      <div className="flex items-center p-2 border-b bg-muted/20 overflow-x-auto">
                        <TooltipProvider>
                          <div className="flex items-center space-x-1 border-r pr-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => applyFormatting('bold', undefined, e)}
                                >
                                  <Bold className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Negrito</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => applyFormatting('italic', undefined, e)}
                                >
                                  <Italic className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Itálico</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => applyFormatting('underline', undefined, e)}
                                >
                                  <Underline className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Sublinhado</TooltipContent>
                            </Tooltip>
                          </div>
                          
                          <div className="flex items-center space-x-1 px-1 border-r">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => applyFormatting('align-left', undefined, e)}
                                >
                                  <AlignLeft className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Alinhar à esquerda</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => applyFormatting('align-center', undefined, e)}
                                >
                                  <AlignCenter className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Centralizar</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => applyFormatting('align-right', undefined, e)}
                                >
                                  <AlignRight className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Alinhar à direita</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => applyFormatting('align-justify', undefined, e)}
                                >
                                  <AlignJustify className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Justificar</TooltipContent>
                            </Tooltip>
                          </div>
                          
                          <div className="flex items-center space-x-1 px-1 border-r">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => applyFormatting('list-ul', undefined, e)}
                                >
                                  <List className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Lista com marcadores</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => applyFormatting('list-ol', undefined, e)}
                                >
                                  <ListOrdered className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Lista numerada</TooltipContent>
                            </Tooltip>
                          </div>
                          
                          <div className="flex items-center space-x-1 px-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => applyFormatting('table', undefined, e)}
                                >
                                  <Table className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Inserir tabela</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => applyFormatting('link', undefined, e)}
                                >
                                  <Link className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Inserir link</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                      
                      <Textarea
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e);
                          // Sincronizar com o textarea principal
                          form.setValue("content", e.target.value, { shouldValidate: true });
                        }}
                        placeholder="Digite o conteúdo do modelo de contrato aqui..."
                        className="font-mono resize-none p-4 flex-1 h-full min-h-[calc(100vh-180px)] rounded-none border-0"
                      />
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 mt-1"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Ativo</FormLabel>
                <FormDescription>
                  Desmarque esta opção para desativar o modelo temporariamente sem excluí-lo.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Modelo
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
    </TooltipProvider>
  );
}