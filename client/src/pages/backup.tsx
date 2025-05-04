import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Download, Upload, Database, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

// Função para formatar o tamanho do arquivo em KB, MB ou GB
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) {
    return bytes + ' bytes';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
};

const Backup = () => {
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupResult, setBackupResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Gerar nome de arquivo de backup com data e hora atual
  const getBackupFileName = () => {
    const now = new Date();
    const formattedDate = format(now, 'yyyy-MM-dd_HH-mm-ss');
    return `imovelgest_backup_${formattedDate}.json`;
  };

  // Função para realizar o backup
  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      setBackupProgress(10);
      setBackupResult(null);

      // Simulação de progresso
      const progressInterval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      console.log("Verificando autenticação antes do backup...");
      // Verificar se o usuário está autenticado
      const userCheckResponse = await fetch("/api/user", {
        method: "GET",
        credentials: "include"
      });
      
      if (!userCheckResponse.ok) {
        console.error("Usuário não autenticado. Redirecionando para login...");
        window.location.href = "/auth";
        return;
      }
      
      console.log("Usuário autenticado. Iniciando backup...");
      
      // Requisição para o backend gerar o backup - usa fetch diretamente 
      // para possibilitar download usando blob
      const response = await fetch("/api/admin/backup", {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro no backup (${response.status}):`, errorText);
        
        if (response.status === 401) {
          toast({
            title: "Sessão expirada",
            description: "Sua sessão expirou. Por favor, faça login novamente.",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/auth";
          }, 2000);
          return;
        }
        
        throw new Error(`Erro ao fazer backup: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      clearInterval(progressInterval);
      setBackupProgress(100);

      if (response.ok) {
        // Criar um objeto Blob com os dados
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        
        // Criar URL para download
        const url = window.URL.createObjectURL(blob);
        
        // Criar elemento <a> para download
        const a = document.createElement("a");
        a.href = url;
        a.download = getBackupFileName();
        document.body.appendChild(a);
        a.click();
        
        // Limpar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setBackupResult({
          success: true,
          message: "Backup realizado com sucesso!",
          data: {
            tables: Object.keys(data).length,
            size: formatFileSize(JSON.stringify(data).length),
            date: new Date().toLocaleString()
          }
        });
        
        toast({
          title: "Backup concluído",
          description: "Os dados foram salvos com sucesso.",
          variant: "default",
        });
      } else {
        throw new Error(data.message || "Erro ao realizar backup");
      }
    } catch (error: any) {
      setBackupResult({
        success: false,
        message: `Erro ao realizar backup: ${error.message}`,
      });
      
      toast({
        title: "Erro no backup",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Função para manipular a seleção do arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setRestoreResult(null);
    }
  };

  // Função para realizar a restauração
  const handleRestore = async () => {
    if (!selectedFile) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo de backup para restaurar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreProgress(10);
      setRestoreResult(null);

      // Simulação de progresso
      const progressInterval = setInterval(() => {
        setRestoreProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 200);

      // Ler o arquivo
      const fileContent = await selectedFile.text();
      let backupData;
      
      try {
        backupData = JSON.parse(fileContent);
      } catch (e) {
        throw new Error("Arquivo de backup inválido ou corrompido");
      }

      // Enviar para o backend
      const response = await apiRequest("POST", "/api/admin/restore", backupData);

      clearInterval(progressInterval);
      setRestoreProgress(100);

      const result = await response.json();

      if (response.ok) {
        setRestoreResult({
          success: true,
          message: "Restauração concluída com sucesso!",
        });
        
        toast({
          title: "Restauração concluída",
          description: "Os dados foram restaurados com sucesso.",
          variant: "default",
        });
        
        // Limpar o arquivo selecionado
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        throw new Error(result.message || "Erro ao restaurar dados");
      }
    } catch (error: any) {
      setRestoreResult({
        success: false,
        message: `Erro na restauração: ${error.message}`,
      });
      
      toast({
        title: "Erro na restauração",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Backup e Restauração</h1>
      </div>

      <Tabs defaultValue="backup" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md mb-4">
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="restore">Restauração</TabsTrigger>
        </TabsList>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Backup do Sistema
              </CardTitle>
              <CardDescription>
                Faça uma cópia de segurança de todos os dados do sistema em um arquivo JSON.
                Recomendamos fazer backups periódicos para evitar perda de dados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 bg-amber-50 text-amber-900 border-amber-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Importante</AlertTitle>
                <AlertDescription>
                  O backup inclui todos os dados cadastrados no sistema. 
                  Mantenha os arquivos de backup em local seguro.
                </AlertDescription>
              </Alert>

              {isBackingUp && (
                <div className="my-4">
                  <p className="mb-2 text-sm text-neutral-600">Gerando backup...</p>
                  <Progress value={backupProgress} className="h-2" />
                </div>
              )}

              {backupResult && (
                <div className={`p-4 rounded-md mb-4 ${backupResult.success ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                  <div className="flex items-start gap-2">
                    {backupResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-medium ${backupResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {backupResult.success ? 'Backup concluído' : 'Falha no backup'}
                      </p>
                      <p className="text-sm mt-1">{backupResult.message}</p>
                      
                      {backupResult.success && backupResult.data && (
                        <div className="mt-2 text-sm text-neutral-600">
                          <p>Tabelas incluídas: {backupResult.data.tables}</p>
                          <p>Tamanho do backup: {backupResult.data.size}</p>
                          <p>Data: {backupResult.data.date}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleBackup} 
                disabled={isBackingUp}
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                {isBackingUp ? 'Gerando backup...' : 'Gerar backup'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="restore">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Restauração do Sistema
              </CardTitle>
              <CardDescription>
                Restaure os dados do sistema a partir de um arquivo de backup JSON previamente gerado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 bg-red-50 text-red-900 border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  A restauração substituirá todos os dados atuais do sistema. Esta ação não pode ser desfeita.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="backup-file" className="block mb-2">
                    Arquivo de backup
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      ref={fileInputRef}
                      id="backup-file"
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                  </div>
                  {selectedFile && (
                    <p className="mt-2 text-sm text-neutral-600">
                      Arquivo selecionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                {isRestoring && (
                  <div className="my-4">
                    <p className="mb-2 text-sm text-neutral-600">Restaurando dados...</p>
                    <Progress value={restoreProgress} className="h-2" />
                  </div>
                )}

                {restoreResult && (
                  <div className={`p-4 rounded-md ${restoreResult.success ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                    <div className="flex items-start gap-2">
                      {restoreResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      )}
                      <div>
                        <p className={`font-medium ${restoreResult.success ? 'text-green-700' : 'text-red-700'}`}>
                          {restoreResult.success ? 'Restauração concluída' : 'Falha na restauração'}
                        </p>
                        <p className="text-sm mt-1">{restoreResult.message}</p>
                        
                        {restoreResult.success && (
                          <p className="text-sm text-neutral-600 mt-2">
                            É recomendado recarregar a página para visualizar os dados restaurados.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleRestore} 
                disabled={isRestoring || !selectedFile}
                className="gap-2"
                variant="destructive"
              >
                <Database className="h-4 w-4" />
                {isRestoring ? 'Restaurando...' : 'Restaurar dados'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Backup;