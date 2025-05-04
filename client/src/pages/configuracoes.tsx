import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowUpCircle, Settings, Loader2 } from "lucide-react";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Configuracoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showResultado, setShowResultado] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  
  const isAdmin = user?.role === 'admin';
  
  const converterNomesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/system/convert-names-to-uppercase");
      return await res.json();
    },
    onSuccess: (data) => {
      setResultado(data.result);
      setShowResultado(true);
      toast({
        title: "Operação concluída",
        description: "Nomes convertidos para maiúsculas com sucesso",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na operação",
        description: error.message || "Ocorreu um erro ao converter os nomes para maiúsculas",
        variant: "destructive",
      });
    },
  });

  const handleConverterNomes = () => {
    converterNomesMutation.mutate();
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="mb-1 text-sm text-neutral-500">Sistema</div>
        <h1 className="text-2xl font-semibold text-neutral-900">Configurações</h1>
        <p className="text-neutral-600 mt-1">
          Configurações e ferramentas do sistema
        </p>
      </div>

      {!isAdmin && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso restrito</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar configurações do sistema.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowUpCircle className="h-5 w-5 mr-2 text-blue-500" />
              Padronização de Dados
            </CardTitle>
            <CardDescription>
              Ferramentas para padronizar e corrigir dados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                <h3 className="text-md font-medium text-neutral-900 mb-2">
                  Converter Nomes para Maiúsculas
                </h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Esta ferramenta converte para letras maiúsculas todos os nomes de proprietários, inquilinos e imóveis cadastrados no sistema.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      className="w-full"
                      disabled={!isAdmin || converterNomesMutation.isPending}
                    >
                      {converterNomesMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Settings className="mr-2 h-4 w-4" />
                          Converter Nomes para Maiúsculas
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar operação</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta operação vai converter todos os nomes de proprietários, inquilinos, fiadores e imóveis para letras maiúsculas.
                        Esta ação não pode ser desfeita. Deseja continuar?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConverterNomes}>
                        Sim, converter todos os nomes
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                {showResultado && resultado && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-green-800 mb-2">
                      Resultado da conversão:
                    </h4>
                    <ul className="text-sm text-green-700 list-disc pl-5 space-y-1">
                      <li>{resultado.ownersUpdated} proprietários atualizados</li>
                      <li>{resultado.tenantsUpdated} inquilinos atualizados</li>
                      <li>{resultado.propertiesUpdated} imóveis atualizados</li>
                      <li>Total: {resultado.total} registros convertidos</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Configuracoes;