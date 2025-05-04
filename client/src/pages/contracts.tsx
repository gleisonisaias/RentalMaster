import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, FileText, FilePlus, FileDown, RefreshCw, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Contract, Owner, Tenant, Property, 
  contracts 
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { ContractForm } from "@/components/contract-form";
import { ContractPDFDialog } from "@/components/contract-pdf-dialog";
import { RenewalPDFButton } from "@/components/renewal-pdf-button";
import { PaymentSlipsDialog } from "@/components/payment-slips-dialog";
import { formatDate, formatCurrency, formatContractStatus } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const Contracts = () => {
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isEditContractOpen, setIsEditContractOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isPDFDialogOpen, setIsPDFDialogOpen] = useState(false);
  const [isPaymentSlipsDialogOpen, setIsPaymentSlipsDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Get all contracts
  const { data: contracts, isLoading: isLoadingContracts } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
    onError: () => {
      toast({
        title: "Erro ao carregar contratos",
        description: "Não foi possível carregar a lista de contratos",
        variant: "destructive",
      });
    }
  });

  // Get all owners
  const { data: owners } = useQuery<Owner[]>({
    queryKey: ['/api/owners']
  });

  // Get all tenants
  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants']
  });

  // Get all properties
  const { data: properties } = useQuery<Property[]>({
    queryKey: ['/api/properties']
  });

  // Delete contract mutation
  const deleteContractMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await apiRequest('DELETE', `/api/contracts/${id}`);
        return response;
      } catch (error: any) {
        // Se a resposta contém um JSON, tentar extrair a mensagem e outros dados
        if (error.response) {
          try {
            const responseData = await error.response.json();
            if (responseData.hasPaidPayments) {
              throw new Error(responseData.message || "Contrato possui parcelas pagas e não pode ser excluído");
            }
            if (responseData.message) {
              throw new Error(responseData.message);
            }
          } catch (jsonError) {
            // Se não conseguir fazer parse do JSON, usa o erro original
            console.error("Erro ao processar resposta JSON:", jsonError);
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Contrato removido",
        description: "O contrato e suas parcelas foram removidos com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      setIsDeleteAlertOpen(false);
      setSelectedContract(null);
    },
    onError: (error: any) => {
      const message = error.message || "Ocorreu um erro ao remover o contrato";
      toast({
        title: "Erro ao remover contrato",
        description: message,
        variant: "destructive",
      });
    }
  });

  // Open edit modal with selected contract data
  const handleEditContract = (contract: Contract) => {
    setSelectedContract(contract);
    setIsEditContractOpen(true);
  };

  // Open delete confirmation
  const handleDeleteContract = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDeleteAlertOpen(true);
  };
  
  // Open PDF generation dialog
  const handleGeneratePDF = (contract: Contract) => {
    setSelectedContract(contract);
    setIsPDFDialogOpen(true);
  };
  
  // Função para obter o contrato original (se for uma renovação)
  const getOriginalContract = (originalId: number | null) => {
    if (!originalId || !contracts) return null;
    return contracts.find(c => c.id === originalId);
  };
  
  // Handle contract renewal
  const handleRenewContract = (contract: Contract) => {
    navigate(`/contratos/${contract.id}/renovar`);
  };
  
  // Open payment slips generation dialog
  const handleGeneratePaymentSlips = (contract: Contract) => {
    setSelectedContract(contract);
    setIsPaymentSlipsDialogOpen(true);
  };

  // Close new contract modal and refresh
  const handleNewContractSuccess = () => {
    setIsNewContractOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
  }

  // Close edit contract modal and refresh
  const handleEditContractSuccess = () => {
    setIsEditContractOpen(false);
    setSelectedContract(null);
    queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
  }

  // Find owner name by ID
  const getOwnerName = (ownerId: number) => {
    const owner = owners?.find(owner => owner.id === ownerId);
    return owner ? owner.name : 'Proprietário não encontrado';
  };

  // Find tenant name by ID
  const getTenantName = (tenantId: number) => {
    const tenant = tenants?.find(tenant => tenant.id === tenantId);
    return tenant ? tenant.name : 'Inquilino não encontrado';
  };

  // Find property info by ID
  const getPropertyInfo = (propertyId: number) => {
    const property = properties?.find(property => property.id === propertyId);
    if (!property) return 'Imóvel não encontrado';
    
    const address = typeof property.address === 'string' 
      ? JSON.parse(property.address) 
      : property.address;
      
    return `${address.street}, ${address.number} - ${address.city}/${address.state}`;
  };

  // Get badge color based on contract status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'default'; // green
      case 'pendente':
        return 'secondary'; // gray
      case 'encerrado':
        return 'destructive'; // red
      default:
        return 'outline';
    }
  };

  // Filter contracts based on search query and status filter
  const filteredContracts = contracts?.filter(contract => {
    const ownerName = getOwnerName(contract.ownerId).toLowerCase();
    const tenantName = getTenantName(contract.tenantId).toLowerCase();
    const propertyInfo = getPropertyInfo(contract.propertyId).toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    
    const matchesSearch = (
      ownerName.includes(searchLower) ||
      tenantName.includes(searchLower) ||
      propertyInfo.includes(searchLower)
    );
    
    const matchesStatus = statusFilter === 'todos' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="mb-1 text-sm text-neutral-500">Gerenciar contratos</div>
        <h1 className="text-2xl font-semibold text-neutral-900">Contratos</h1>
        <p className="text-neutral-600 mt-1">Gerenciar contratos de locação</p>
      </div>

      {/* Form section */}
      {(isNewContractOpen || isEditContractOpen) && (
        <Card className="border border-neutral-200 shadow-sm mb-6">
          <CardContent className="p-5 pt-6">
            <h2 className="text-xl font-semibold mb-4">
              {isEditContractOpen ? "Editar Contrato" : "Cadastrar Novo Contrato"}
            </h2>
            <ContractForm 
              owners={owners || []}
              tenants={tenants || []}
              properties={properties || []}
              initialData={isEditContractOpen ? selectedContract : null}
              isEditing={isEditContractOpen}
              onSuccess={isEditContractOpen ? handleEditContractSuccess : handleNewContractSuccess}
            />
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsNewContractOpen(false);
                  setIsEditContractOpen(false);
                  setSelectedContract(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <Input
              placeholder="Buscar contratos..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="encerrado">Encerrados</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {!isNewContractOpen && !isEditContractOpen && (
          <Button onClick={() => setIsNewContractOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Contrato
          </Button>
        )}
      </div>

      {isLoadingContracts ? (
        <div className="grid grid-cols-1 gap-4">
          {Array(5).fill(0).map((_, i) => (
            <Card key={i} className="border border-neutral-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:justify-between">
                  <div className="mb-4 md:mb-0">
                    <Skeleton className="h-5 w-64 mb-3" />
                    <Skeleton className="h-4 w-52 mb-2" />
                    <Skeleton className="h-4 w-40 mb-2" />
                  </div>
                  <div className="flex flex-col items-end">
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-4 w-32 mb-2" />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Skeleton className="h-9 w-20 mr-2" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredContracts.length === 0 ? (
        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-neutral-100 p-3 mb-4">
              <FileText className="h-6 w-6 text-neutral-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-1">Nenhum contrato encontrado</h3>
            <p className="text-neutral-500 max-w-md">
              {searchQuery || statusFilter !== 'todos'
                ? "Não foram encontrados contratos correspondentes aos filtros aplicados. Tente alterar sua pesquisa."
                : "Você ainda não cadastrou nenhum contrato. Clique no botão 'Novo Contrato' para começar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-md shadow overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">#</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Inquilino</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Imóvel</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Proprietário</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Aluguel</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Período</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">{contract.id}</td>
                  <td className="py-3 px-4 text-sm font-medium">{getTenantName(contract.tenantId)}</td>
                  <td className="py-3 px-4 text-sm">{getPropertyInfo(contract.propertyId)}</td>
                  <td className="py-3 px-4 text-sm">{getOwnerName(contract.ownerId)}</td>
                  <td className="py-3 px-4 text-sm font-medium">
                    {formatCurrency(contract.rentValue)}
                    <div className="text-xs text-neutral-500">
                      {contract.paymentDay}º dia
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {formatDate(contract.startDate)} a {formatDate(contract.endDate)}
                    <div className="text-xs text-neutral-500">
                      {contract.duration} {contract.duration > 1 ? 'meses' : 'mês'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <Badge variant={getStatusBadgeVariant(contract.status)}>
                      {formatContractStatus(contract.status)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleGeneratePDF(contract)}
                        className="h-8 px-2 py-1"
                        title="Gerar PDF"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      
                      {/* Botão de Renovação (apenas para contratos ativos) */}
                      {contract.status === 'ativo' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRenewContract(contract)}
                          className="h-8 px-2 py-1 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300 hover:bg-green-50"
                          title="Renovar contrato"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Indicação visual para contratos de renovação */}
                      {contract.isRenewal && contract.originalContractId && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-8 px-2 py-1 flex items-center justify-center text-blue-600 border border-blue-200 rounded-md" title="Contrato renovado">
                                <RefreshCw className="h-4 w-4 mr-1" />
                                <span className="text-xs">#{contract.originalContractId}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Renovação do contrato #{contract.originalContractId}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* Botão de gerar carnês de pagamento (apenas para contratos ativos) */}
                      {contract.status === 'ativo' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleGeneratePaymentSlips(contract)}
                          className="h-8 px-2 py-1 text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300 hover:bg-orange-50"
                          title="Gerar carnês de pagamento"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditContract(contract)}
                        className="h-8 px-2 py-1"
                        title="Editar contrato"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteContract(contract)}
                        className="h-8 px-2 py-1"
                        title="Excluir contrato"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Os diálogos foram removidos pois agora o formulário é exibido diretamente na página */}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
              <p className="mt-2 font-medium text-orange-600">
                ATENÇÃO: Esta ação também excluirá todas as parcelas associadas ao contrato.
              </p>
              <p className="mt-2">
                Se o contrato possuir parcelas já pagas, não será possível excluí-lo.
                Neste caso, você deve marcar o contrato como encerrado.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedContract && deleteContractMutation.mutate(selectedContract.id)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteContractMutation.isPending ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Generation Dialog */}
      {selectedContract && (
        <ContractPDFDialog
          isOpen={isPDFDialogOpen}
          onClose={() => {
            setIsPDFDialogOpen(false);
            setSelectedContract(null);
          }}
          contractId={selectedContract.id}
        />
      )}

      {/* Payment Slips Generation Dialog */}
      {selectedContract && (
        <PaymentSlipsDialog
          isOpen={isPaymentSlipsDialogOpen}
          onClose={() => {
            setIsPaymentSlipsDialogOpen(false);
            setSelectedContract(null);
          }}
          contractId={selectedContract.id}
        />
      )}
    </div>
  );
};

export default Contracts;
