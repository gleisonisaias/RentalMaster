import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ContractTemplate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/page-header";
import Spinner from "@/components/spinner";
import { ContractTemplateEditor } from "@/components/contract-template-editor-quill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  PenSquare, 
  Trash2, 
  MoreVertical, 
  FilePlus 
} from "lucide-react";
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

export default function ContractTemplatesPage() {
  const { toast } = useToast();
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<number | null>(null);

  // Buscar modelos de contrato
  const { data: templates = [], isLoading, error } = useQuery<ContractTemplate[]>({
    queryKey: ['/api/contract-templates']
  });

  // Mutação para excluir modelo
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contract-templates/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Modelo excluído",
        description: "O modelo foi excluído com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contract-templates'] });
      setDeleteTemplateId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir modelo",
        description: error.message || "Ocorreu um erro ao excluir o modelo.",
        variant: "destructive",
      });
    },
  });

  // Gerenciar a edição de modelos
  const handleEditTemplate = (template: ContractTemplate) => {
    setEditingTemplate(template);
  };

  // Gerenciar exclusão de modelos
  const handleDeleteTemplate = (id: number) => {
    setDeleteTemplateId(id);
  };

  // Confirmar exclusão de modelo
  const confirmDelete = () => {
    if (deleteTemplateId) {
      deleteMutation.mutate(deleteTemplateId);
    }
  };

  // Filtrar modelos por tipo
  const residentialTemplates = templates ? templates.filter(
    (template: ContractTemplate) => template.type === "residential"
  ) : [];
  const commercialTemplates = templates ? templates.filter(
    (template: ContractTemplate) => template.type === "commercial"
  ) : [];

  // Renderizar cartão de modelo
  const renderTemplateCard = (template: ContractTemplate) => (
    <Card key={template.id} className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="mt-1 flex items-center">
              <Badge 
                variant={template.type === "residential" ? "default" : "secondary"}
                className="mr-2"
              >
                {template.type === "residential" ? "Residencial" : "Comercial"}
              </Badge>
              {template.isActive ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Ativo
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  Inativo
                </Badge>
              )}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                <PenSquare className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDeleteTemplate(template.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="text-sm">
        <div className="h-20 overflow-hidden text-ellipsis">
          {template.content.substring(0, 150)}...
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3 flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleEditTemplate(template)}
        >
          <PenSquare className="mr-2 h-4 w-4" />
          Editar modelo
        </Button>
      </CardFooter>
    </Card>
  );

  // Verificar se estamos no modo de edição ou criação
  const isEditingOrCreating = isCreatingTemplate || !!editingTemplate;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title={isEditingOrCreating 
          ? editingTemplate 
            ? "Editar Modelo de Contrato" 
            : "Novo Modelo de Contrato"
          : "Modelos de Contrato"}
        description={isEditingOrCreating 
          ? "Preencha os campos abaixo para criar ou editar o modelo de contrato."
          : "Gerencie os modelos de contrato utilizados para gerar documentos."}
        actions={
          isEditingOrCreating ? (
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreatingTemplate(false);
                setEditingTemplate(null);
              }}
            >
              Voltar para a lista
            </Button>
          ) : (
            <Button onClick={() => setIsCreatingTemplate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Modelo
            </Button>
          )
        }
      />

      {isEditingOrCreating ? (
        // Mostrar formulário de edição/criação
        <div className="mt-6 border rounded-lg p-6 bg-card">
          <ContractTemplateEditor 
            initialData={editingTemplate || undefined}
            templateId={editingTemplate?.id}
            onSuccess={() => {
              setIsCreatingTemplate(false);
              setEditingTemplate(null);
              toast({
                title: editingTemplate ? "Modelo atualizado" : "Modelo criado",
                description: editingTemplate 
                  ? "O modelo foi atualizado com sucesso." 
                  : "O novo modelo foi criado com sucesso.",
              });
            }} 
          />
        </div>
      ) : isLoading ? (
        // Mostrar carregando
        <div className="flex justify-center my-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        // Mostrar erro
        <div className="bg-red-50 p-4 rounded-md text-red-800 my-4">
          Erro ao carregar modelos. Por favor, tente novamente.
        </div>
      ) : (
        // Mostrar lista de modelos
        <div className="mt-6 space-y-8">
          {templates.length === 0 ? (
            <div className="bg-muted/40 rounded-lg p-12 text-center">
              <FilePlus className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum modelo encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro modelo de contrato para começar a gerar documentos.
              </p>
              <Button onClick={() => setIsCreatingTemplate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Modelo
              </Button>
            </div>
          ) : (
            <>
              {residentialTemplates.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Modelos Residenciais</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {residentialTemplates.map(renderTemplateCard)}
                  </div>
                </div>
              )}

              {commercialTemplates.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Modelos Comerciais</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {commercialTemplates.map(renderTemplateCard)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={!!deleteTemplateId}
        onOpenChange={(open) => !open && setDeleteTemplateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Modelo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Spinner className="mr-2" size="sm" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}