import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FilePlus, FileUp, AlertCircle, Trash2, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { TenantDocument } from "@shared/schema";

interface DocumentUploadProps {
  tenantId: number;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

const getDocumentTypeName = (type: string) => {
  const types: Record<string, string> = {
    identidade: "Documento de Identidade",
    cpf: "CPF",
    comprovante_residencia: "Comprovante de Residência",
    comprovante_renda: "Comprovante de Renda",
    holerite: "Holerite",
    contrato_trabalho: "Contrato de Trabalho",
    contrato_social: "Contrato Social",
    outro: "Outro Documento"
  };
  
  return types[type] || type;
};

export function DocumentUpload({ tenantId }: DocumentUploadProps) {
  const [documentType, setDocumentType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Buscar documentos do inquilino
  const { 
    data: documents = [], 
    isLoading, 
    error, 
    refetch
  } = useQuery<TenantDocument[]>({
    queryKey: [`/api/tenants/${tenantId}/documents`],
    enabled: !!tenantId
  });
  
  // Mutation para upload de documento
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/tenants/${tenantId}/documents`, {
        method: 'POST',
        // Não defina o Content-Type manualmente, deixe o navegador configurar o boundary correto para multipart/form-data
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao fazer upload do documento");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Documento enviado com sucesso",
        description: "O documento foi adicionado ao cadastro do inquilino",
      });
      setFile(null);
      setDocumentType("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/documents`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar documento",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation para excluir documento
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await apiRequest("DELETE", `/api/documents/${documentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao excluir documento");
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Documento excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/documents`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir documento",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadError(null);
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setUploadError("Selecione um arquivo para enviar");
      return;
    }
    
    if (!documentType) {
      setUploadError("Selecione o tipo de documento");
      return;
    }
    
    setUploading(true);
    setUploadError(null);
    
    // Criar um novo FormData e adicionar os campos
    const formData = new FormData();
    // No backend, o Busboy está esperando um campo sem nome específico, então usamos 'file'
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (description) formData.append('description', description);
    
    try {
      await uploadMutation.mutateAsync(formData);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
    } finally {
      setUploading(false);
    }
  };
  
  const handleDelete = (documentId: number) => {
    if (window.confirm("Tem certeza que deseja excluir este documento?")) {
      deleteMutation.mutate(documentId);
    }
  };
  
  const downloadDocument = (documentId: number, fileName: string) => {
    window.open(`/api/documents/${documentId}/download`, '_blank');
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload de Documento</CardTitle>
          <CardDescription>
            Adicione documentos ao cadastro do inquilino
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentType">Tipo de Documento</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identidade">Documento de Identidade</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="comprovante_residencia">Comprovante de Residência</SelectItem>
                  <SelectItem value="comprovante_renda">Comprovante de Renda</SelectItem>
                  <SelectItem value="holerite">Holerite</SelectItem>
                  <SelectItem value="contrato_trabalho">Contrato de Trabalho</SelectItem>
                  <SelectItem value="contrato_social">Contrato Social</SelectItem>
                  <SelectItem value="outro">Outro Documento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FilePlus className="mr-2 h-4 w-4" />
                  {file ? file.name : "Selecionar arquivo"}
                </Button>
              </div>
              {file && (
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Adicione uma descrição ou observação sobre o documento"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleUpload} 
            disabled={uploading || !file || !documentType}
            className="ml-auto"
          >
            {uploading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                Enviar Documento
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Documentos do Inquilino</CardTitle>
          <CardDescription>
            Lista de documentos enviados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Carregando documentos...</p>}
          {error && <p className="text-red-500">Erro ao carregar documentos</p>}
          {!isLoading && documents.length === 0 && (
            <p className="text-muted-foreground">Nenhum documento encontrado</p>
          )}
          
          {documents.length > 0 && (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center justify-between p-4 border rounded-md"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium">{getDocumentTypeName(doc.documentType)}</h4>
                    <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                    {doc.description && (
                      <p className="text-sm">{doc.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enviado em {doc.uploadedAt ? formatDate(doc.uploadedAt.toString()) : 'Data não registrada'} - {formatBytes(doc.fileSize)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => downloadDocument(doc.id, doc.fileName)}
                      title="Baixar documento"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      title="Excluir documento"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}