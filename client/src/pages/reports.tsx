import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, DownloadCloud, BarChart3, TrendingUp, 
  Calendar, DollarSign, Home, Users, HistoryIcon, RefreshCw, Loader2
} from "lucide-react";
import { 
  Contract, Owner, Tenant, Property, Payment
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

interface DeletedPayment {
  id: number;
  originalId: number;
  contractId: number;
  value: number;
  dueDate: string;
  isPaid: boolean;
  paymentDate: string | null;
  interestAmount: number;
  latePaymentFee: number;
  paymentMethod: string | null;
  receiptNumber: string | null;
  observations: string | null;
  deletedBy: number;
  originalCreatedAt: Date | null;
  deletedAt: Date;
  createdAt: Date | null;
}

interface User {
  id: number;
  name: string;
  username: string;
}
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Chart placeholder for this version
const ChartPlaceholder = ({ height = 300 }: { height?: number }) => (
  <div className={`w-full h-[${height}px] border border-dashed border-neutral-300 rounded-md bg-neutral-50 flex items-center justify-center`}>
    <div className="text-center">
      <BarChart3 className="h-10 w-10 text-neutral-400 mx-auto mb-2" />
      <p className="text-neutral-500">Visualização de gráfico não implementada nesta versão</p>
    </div>
  </div>
);

const Reports = () => {
  // Verifica se há algum parâmetro de tipo no URL
  const getInitialReportType = () => {
    const params = new URLSearchParams(window.location.search);
    const tipoParam = params.get('tipo');
    return tipoParam || "contracts"; // Padrão para contratos se não houver parâmetro
  };
  
  const [reportType, setReportType] = useState<string>(getInitialReportType());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [paymentToRestore, setPaymentToRestore] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Mutation para restaurar pagamento
  const restoreMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await apiRequest("POST", `/api/deleted-payments/restore/${paymentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao restaurar pagamento");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deleted-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({
        title: "Pagamento restaurado",
        description: "O pagamento foi restaurado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao restaurar",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Função para abrir diálogo de confirmação
  const handleRestoreClick = (paymentId: number) => {
    setPaymentToRestore(paymentId);
    setIsRestoreDialogOpen(true);
  };
  
  // Função para confirmar restauração
  const confirmRestore = () => {
    if (paymentToRestore) {
      restoreMutation.mutate(paymentToRestore);
      setIsRestoreDialogOpen(false);
      setPaymentToRestore(null);
    }
  };

  // Get all data for reports
  const { data: contracts, isLoading: isLoadingContracts } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
    onError: () => {
      toast({
        title: "Erro ao carregar dados de contratos",
        description: "Não foi possível carregar os dados para o relatório",
        variant: "destructive",
      });
    }
  });

  const { data: owners } = useQuery<Owner[]>({
    queryKey: ['/api/owners']
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants']
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ['/api/properties']
  });

  const { data: payments } = useQuery<Payment[]>({
    queryKey: ['/api/payments']
  });
  
  const { data: deletedPayments } = useQuery<DeletedPayment[]>({
    queryKey: ['/api/deleted-payments']
  });
  
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users']
  });

  // Helper to find owner name by ID
  const getOwnerName = (ownerId: number) => {
    const owner = owners?.find(owner => owner.id === ownerId);
    return owner ? owner.name : 'Proprietário não encontrado';
  };

  // Helper to find tenant name by ID
  const getTenantName = (tenantId: number) => {
    const tenant = tenants?.find(tenant => tenant.id === tenantId);
    return tenant ? tenant.name : 'Inquilino não encontrado';
  };

  // Helper to find property info by ID
  const getPropertyInfo = (propertyId: number) => {
    const property = properties?.find(property => property.id === propertyId);
    if (!property) return 'Imóvel não encontrado';
    
    const address = typeof property.address === 'string' 
      ? JSON.parse(property.address) 
      : property.address;
      
    return `${address.street}, ${address.number} - ${address.city}/${address.state}`;
  };

  // Calculate summary statistics
  const calculateSummaryStats = () => {
    if (!contracts || !properties || !payments) {
      return {
        activeContracts: 0,
        totalRentValue: 0,
        availableProperties: 0,
        totalPaymentsReceived: 0,
        pendingPayments: 0
      };
    }

    const activeContracts = contracts.filter(c => c.status === 'ativo').length;
    
    const totalRentValue = contracts
      .filter(c => c.status === 'ativo')
      .reduce((sum, c) => sum + c.rentValue, 0);
    
    const availableProperties = properties.filter(p => p.availableForRent).length;
    
    const totalPaymentsReceived = payments
      .filter(p => p.isPaid)
      .reduce((sum, p) => sum + p.value, 0);
    
    const pendingPayments = payments
      .filter(p => !p.isPaid)
      .reduce((sum, p) => sum + p.value, 0);

    return {
      activeContracts,
      totalRentValue,
      availableProperties,
      totalPaymentsReceived,
      pendingPayments
    };
  };

  const stats = calculateSummaryStats();

  // Handle fake export report
  const handleExportReport = () => {
    toast({
      title: "Relatório gerado",
      description: "O relatório foi gerado e está pronto para download",
    });
  };

  // Render report content based on selected type
  const renderReportContent = () => {
    if (isLoadingContracts || !contracts) {
      return (
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="border border-neutral-200 rounded-md p-4">
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
            </div>
          ))}
        </div>
      );
    }

    switch (reportType) {
      case "contracts":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Contratos Ativos</h3>
              <Button size="sm" onClick={handleExportReport}>
                <DownloadCloud className="h-4 w-4 mr-2" /> Exportar
              </Button>
            </div>
            
            <ChartPlaceholder height={250} />
            
            <div className="space-y-3 mt-6">
              {contracts
                .filter(c => c.status === 'ativo')
                .map(contract => (
                  <div key={contract.id} className="border border-neutral-200 rounded-md p-4">
                    <div className="flex justify-between mb-2">
                      <h4 className="font-medium">Contrato #{contract.id}</h4>
                      <span className="font-semibold">{formatCurrency(contract.rentValue)}</span>
                    </div>
                    <p className="text-sm text-neutral-600">
                      <strong>Inquilino:</strong> {getTenantName(contract.tenantId)}
                    </p>
                    <p className="text-sm text-neutral-600">
                      <strong>Imóvel:</strong> {getPropertyInfo(contract.propertyId)}
                    </p>
                    <p className="text-sm text-neutral-600">
                      <strong>Período:</strong> {formatDate(contract.startDate)} a {formatDate(contract.endDate)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        );

      case "payments":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Pagamentos Recebidos</h3>
              <Button size="sm" onClick={handleExportReport}>
                <DownloadCloud className="h-4 w-4 mr-2" /> Exportar
              </Button>
            </div>
            
            <ChartPlaceholder height={250} />
            
            <div className="space-y-3 mt-6">
              {payments
                ?.filter(p => p.isPaid)
                .map(payment => {
                  const contract = contracts.find(c => c.id === payment.contractId);
                  if (!contract) return null;
                  
                  return (
                    <div key={payment.id} className="border border-neutral-200 rounded-md p-4">
                      <div className="flex justify-between mb-2">
                        <h4 className="font-medium">Pagamento #{payment.id}</h4>
                        <span className="font-semibold">{formatCurrency(payment.value)}</span>
                      </div>
                      <p className="text-sm text-neutral-600">
                        <strong>Inquilino:</strong> {getTenantName(contract.tenantId)}
                      </p>
                      <p className="text-sm text-neutral-600">
                        <strong>Imóvel:</strong> {getPropertyInfo(contract.propertyId)}
                      </p>
                      <p className="text-sm text-neutral-600">
                        <strong>Data de pagamento:</strong> {payment.paymentDate && formatDate(payment.paymentDate)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        );

      case "properties":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Imóveis Disponíveis</h3>
              <Button size="sm" onClick={handleExportReport}>
                <DownloadCloud className="h-4 w-4 mr-2" /> Exportar
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {properties
                ?.filter(p => p.availableForRent)
                .map(property => {
                  const address = typeof property.address === 'string' 
                    ? JSON.parse(property.address) 
                    : property.address;
                    
                  return (
                    <div key={property.id} className="border border-neutral-200 rounded-md p-4">
                      <div className="flex justify-between mb-2">
                        <h4 className="font-medium">{address.street}, {address.number}</h4>
                        <span className="font-semibold">{formatCurrency(property.rentValue)}</span>
                      </div>
                      <p className="text-sm text-neutral-600">
                        <strong>Tipo:</strong> {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                      </p>
                      <p className="text-sm text-neutral-600">
                        <strong>Localização:</strong> {address.neighborhood}, {address.city}/{address.state}
                      </p>
                      <p className="text-sm text-neutral-600">
                        <strong>Proprietário:</strong> {getOwnerName(property.ownerId)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        );
        
      case "deleted-payments":
        // Função para buscar informações do contrato
        const getContractInfo = (contractId: number) => {
          const contract = contracts?.find(c => c.id === contractId);
          if (!contract) return { tenant: "Contrato não encontrado", property: "Desconhecido" };
          
          const tenant = tenants?.find(t => t.id === contract.tenantId);
          const property = properties?.find(p => p.id === contract.propertyId);
          
          const propertyAddress = property ? (typeof property.address === 'string' 
            ? JSON.parse(property.address) 
            : property.address) : null;
          
          return { 
            tenant: tenant?.name || "Inquilino não encontrado",
            property: propertyAddress ? `${propertyAddress.street}, ${propertyAddress.number}` : "Imóvel não encontrado" 
          };
        };
        
        // Filtragem de pagamentos baseada na busca
        const filteredPayments = deletedPayments?.filter(payment => {
          if (!searchQuery.trim()) return true;
          
          const lowerCaseQuery = searchQuery.toLowerCase();
          const contractInfo = getContractInfo(payment.contractId);
          const userInfo = users?.find(u => u.id === payment.deletedBy);
          const status = payment.isPaid ? "pago" : "agendado";
          
          return (
            payment.contractId.toString().includes(lowerCaseQuery) ||
            payment.value.toString().includes(lowerCaseQuery) ||
            format(new Date(payment.dueDate), "dd/MM/yyyy", { locale: ptBR }).toLowerCase().includes(lowerCaseQuery) ||
            (userInfo?.name && userInfo.name.toLowerCase().includes(lowerCaseQuery)) ||
            (contractInfo.tenant && contractInfo.tenant.toLowerCase().includes(lowerCaseQuery)) ||
            (contractInfo.property && contractInfo.property.toLowerCase().includes(lowerCaseQuery)) ||
            status.includes(lowerCaseQuery)
          );
        });
        
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Pagamentos Excluídos</h3>
              <Button size="sm" onClick={handleExportReport}>
                <DownloadCloud className="h-4 w-4 mr-2" /> Exportar
              </Button>
            </div>
            
            {/* Campo de busca */}
            <div className="relative">
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Buscar em todos os campos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchQuery("")}
                >
                  &times;
                </button>
              )}
            </div>
            
            {!deletedPayments || deletedPayments.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <p className="text-gray-500">Nenhum pagamento excluído encontrado</p>
              </div>
            ) : filteredPayments?.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <p className="text-gray-500">Nenhum resultado encontrado para sua busca</p>
              </div>
            ) : (
              <div className="bg-white rounded-md shadow overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Contrato</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Inquilino</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Valor</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Data de Vencimento</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Status</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Excluído por</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Data de Exclusão</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments?.map(payment => {
                      const contractInfo = getContractInfo(payment.contractId);
                      const userInfo = users?.find(u => u.id === payment.deletedBy);
                      return (
                        <tr key={payment.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm">#{payment.contractId}</td>
                          <td className="py-3 px-4 text-sm">{contractInfo.tenant}</td>
                          <td className="py-3 px-4 text-sm font-medium">
                            {formatCurrency(payment.value)}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {format(new Date(payment.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className={payment.isPaid ? "text-green-600 font-medium" : "text-orange-500 font-medium"}>
                              {payment.isPaid ? "Pago" : "Agendado"}
                              {payment.wasRestored && (
                                <span className="ml-1 text-blue-800 font-bold px-1 bg-blue-100 rounded" title="Pagamento estava marcado como restaurado quando foi excluído">(R)</span>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {userInfo ? userInfo.name : `Usuário ${payment.deletedBy}`}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {format(new Date(payment.deletedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center"
                              onClick={() => handleRestoreClick(payment.id)}
                              disabled={restoreMutation.isPending}
                            >
                              {restoreMutation.isPending && paymentToRestore === payment.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3 mr-1" />
                              )}
                              Restaurar
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      default:
        return <p>Selecione um tipo de relatório para visualizar</p>;
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Diálogo de confirmação para restaurar pagamento */}
      <AlertDialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja restaurar este pagamento?
              <p className="mt-2 text-amber-600">
                Atenção: Se este pagamento já foi registrado novamente e está pago, 
                a restauração resultará em duplicidade de pagamentos.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restaurando...
                </>
              ) : (
                "Sim, restaurar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="mb-6">
        <div className="mb-1 text-sm text-neutral-500">Gerenciar relatórios</div>
        <h1 className="text-2xl font-semibold text-neutral-900">Relatórios</h1>
        <p className="text-neutral-600 mt-1">Visualize e exporte relatórios do sistema</p>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Contratos Ativos
            </CardTitle>
            <FileText className="h-4 w-4 text-primary-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingContracts ? <Skeleton className="h-8 w-16" /> : stats.activeContracts}
            </div>
            <p className="text-xs text-neutral-500">
              Total de {formatCurrency(stats.totalRentValue)} em aluguéis
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Imóveis Disponíveis
            </CardTitle>
            <Home className="h-4 w-4 text-primary-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingContracts ? <Skeleton className="h-8 w-16" /> : stats.availableProperties}
            </div>
            <p className="text-xs text-neutral-500">
              De um total de {properties?.length || 0} imóveis
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pagamentos Recebidos
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingContracts ? <Skeleton className="h-8 w-16" /> : formatCurrency(stats.totalPaymentsReceived)}
            </div>
            <p className="text-xs text-neutral-500">
              Total recebido até o momento
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pagamentos Pendentes
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingContracts ? <Skeleton className="h-8 w-16" /> : formatCurrency(stats.pendingPayments)}
            </div>
            <p className="text-xs text-neutral-500">
              Valor total a receber
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Selector and Content */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 md:p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold text-neutral-900">Visualizar Relatório</h2>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Selecione o tipo de relatório" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contracts">Contratos</SelectItem>
              <SelectItem value="payments">Pagamentos</SelectItem>
              <SelectItem value="properties">Imóveis</SelectItem>
              <SelectItem value="deleted-payments">Pagamentos Excluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {renderReportContent()}
      </div>
    </div>
  );
};

export default Reports;
