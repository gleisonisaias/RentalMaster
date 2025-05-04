import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, CheckCircle, BanknoteIcon, Receipt, AlertTriangle, Trash2, CalendarIcon, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
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
  Payment, Contract, Tenant, Owner, Property
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { PaymentForm } from "@/components/payment-form";
import { PaymentReceiptDialog } from "@/components/payment-receipt-dialog-simple";
import { formatDate, formatCurrency, isPaymentOverdue } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AdminPasswordDialog } from "@/components/admin-password-dialog";

const Payments = () => {
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false);
  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAdminPasswordDialogOpen, setIsAdminPasswordDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentIdToDelete, setPaymentIdToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [location, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"lista" | "inquilino">("lista");
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [interestAmount, setInterestAmount] = useState<number>(0);
  const [latePaymentFee, setLatePaymentFee] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>("");
  // Função para formatar a data para o formato ISO
  const formatDateToISO = (date: Date) => {
    return date.toISOString().split("T")[0];
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all payments
  const { data: payments, isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ['/api/payments'],
    onError: () => {
      toast({
        title: "Erro ao carregar pagamentos",
        description: "Não foi possível carregar a lista de pagamentos",
        variant: "destructive",
      });
    }
  });

  // Get all contracts for payment form and details
  const { data: contracts } = useQuery<Contract[]>({
    queryKey: ['/api/contracts']
  });

  // Get all tenants for payment details
  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants']
  });

  // Get all owners for payment details
  const { data: owners } = useQuery<Owner[]>({
    queryKey: ['/api/owners']
  });

  // Get all properties for payment details
  const { data: properties } = useQuery<Property[]>({
    queryKey: ['/api/properties']
  });

  // Update payment to mark as paid
  const markAsPaidMutation = useMutation({
    mutationFn: async (data: { id: number, paymentMethod: string, receiptNumber: string, paymentDate?: string, interestAmount?: number, latePaymentFee?: number }) => {
      // Use a data fornecida ou a data atual
      const paymentDate = data.paymentDate || new Date().toISOString().split('T')[0];
      const response = await apiRequest('PATCH', `/api/payments/${data.id}`, {
        isPaid: true,
        paymentDate,
        paymentMethod: data.paymentMethod,
        receiptNumber: data.receiptNumber,
        interestAmount: data.interestAmount || 0,
        latePaymentFee: data.latePaymentFee || 0
      });
      return response.json();
    },
    onSuccess: (updatedPayment) => {
      toast({
        title: "Pagamento confirmado",
        description: "O pagamento foi confirmado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      setIsConfirmPaymentOpen(false);
      
      // Mostrar recibo ao confirmar pagamento
      if (selectedPayment) {
        setSelectedPayment({...selectedPayment, isPaid: true});
        setIsReceiptDialogOpen(true);
      } else {
        setSelectedPayment(null);
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao confirmar pagamento",
        description: error.message || "Ocorreu um erro ao confirmar o pagamento",
        variant: "destructive",
      });
    }
  });
  
  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async ({ id, adminPassword }: { id: number, adminPassword?: string }) => {
      // Tenta excluir o pagamento, enviando senha de admin quando disponível
      const data = adminPassword 
        ? { adminPassword } 
        : undefined;
      
      try {
        const response = await apiRequest('DELETE', `/api/payments/${id}`, data);
        
        if (response.status === 204) {
          return { success: true };
        }
        
        const result = await response.json();
        
        // Se o servidor pedir a senha de administrador
        if (response.status === 403 && result.requireAdminPassword) {
          return { requireAdminPassword: true, message: result.message };
        }
        
        // Se houve outro tipo de erro
        if (!response.ok) {
          throw new Error(result.message || "Erro ao excluir pagamento");
        }
        
        return result;
      } catch (error: any) {
        throw new Error(error.message || "Erro ao excluir pagamento");
      }
    },
    onSuccess: (result) => {
      // Verificar se precisa de senha de admin
      if (result.requireAdminPassword) {
        setIsAdminPasswordDialogOpen(true);
        return;
      }
      
      // Pagamento excluído com sucesso
      toast({
        title: "Pagamento excluído",
        description: "O pagamento foi excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir pagamento",
        description: error.message || "Ocorreu um erro ao excluir o pagamento",
        variant: "destructive",
      });
    }
  });

  // Handle confirm payment
  const handleConfirmPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    // Gerar número de recibo automaticamente
    const receiptPrefix = "REC-";
    const padNumber = String(payment.id).padStart(5, '0');
    setReceiptNumber(`${receiptPrefix}${padNumber}`);
    // Resetar valores de multa e juros
    setInterestAmount(0);
    setLatePaymentFee(0);
    // Inicializar com a data atual para a data de pagamento
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsConfirmPaymentOpen(true);
  };
  
  // Handle open receipt dialog
  const handleOpenReceiptDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsReceiptDialogOpen(true);
  };
  
  // Handle delete payment
  const handleDeletePayment = (id: number) => {
    setPaymentIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle confirm deletion
  const handleConfirmDelete = () => {
    if (paymentIdToDelete) {
      deletePaymentMutation.mutate({ id: paymentIdToDelete });
    }
  };
  
  // Handle admin password submission
  const handleAdminPasswordSubmit = (adminPassword: string) => {
    if (paymentIdToDelete) {
      deletePaymentMutation.mutate({ 
        id: paymentIdToDelete,
        adminPassword 
      });
    }
    setIsAdminPasswordDialogOpen(false);
  };

  // Calculate payments stats
  const calculatePaymentStats = () => {
    if (!payments) return { received: 0, pending: 0, overdue: 0 };
    
    const received = payments.reduce((sum, payment) => 
      payment.isPaid ? sum + payment.value : sum, 0
    );
    
    const today = new Date().toISOString().split('T')[0];
    
    const pending = payments.reduce((sum, payment) => 
      !payment.isPaid && payment.dueDate >= today ? sum + payment.value : sum, 0
    );
    
    const overdue = payments.reduce((sum, payment) => 
      !payment.isPaid && payment.dueDate < today ? sum + payment.value : sum, 0
    );
    
    return { received, pending, overdue };
  };

  const paymentStats = calculatePaymentStats();

  // Get contract details by ID
  const getContractDetails = (contractId: number) => {
    const contract = contracts?.find(c => c.id === contractId);
    if (!contract) return null;
    
    const tenant = tenants?.find(t => t.id === contract.tenantId);
    const property = properties?.find(p => p.id === contract.propertyId);
    const owner = owners?.find(o => o.id === contract.ownerId);
    
    return {
      tenant: tenant?.name || 'Inquilino não encontrado',
      property: property 
        ? `${(typeof property.address === 'string' 
              ? JSON.parse(property.address) 
              : property.address).street}`
        : 'Imóvel não encontrado',
      owner: owner?.name || 'Proprietário não encontrado',
      rentValue: contract.rentValue
    };
  };

  // Filter payments based on search query, status filter, and tenant filter
  // Filtra e depois ordena os pagamentos por data de vencimento crescente
  const filteredPayments = payments?.filter(payment => {
    const contractDetails = getContractDetails(payment.contractId);
    if (!contractDetails) return false;
    
    // Por modo de visualização
    if (viewMode === "inquilino") {
      // Se nenhum inquilino estiver selecionado, mostrar todos
      if (!selectedTenantId) return true;
      
      // Obter o contrato para verificar se o inquilino corresponde
      // Verificar se o contrato existe e se o inquilino selecionado corresponde
      const contract = contracts?.find(c => c.id === payment.contractId);
      if (!contract) return false;
      return contract.tenantId === selectedTenantId;
    }
    
    // Modo de visualização lista com busca
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      contractDetails.tenant.toLowerCase().includes(searchLower) ||
      contractDetails.property.toLowerCase().includes(searchLower) ||
      contractDetails.owner.toLowerCase().includes(searchLower)
    );
    
    const isOverdue = isPaymentOverdue(payment.dueDate, payment.isPaid);
    const matchesStatus = statusFilter === 'todos' || 
      (statusFilter === 'pago' && payment.isPaid) ||
      (statusFilter === 'pendente' && !payment.isPaid && !isOverdue) ||
      (statusFilter === 'vencido' && isOverdue);
    
    return matchesSearch && matchesStatus;
  })
  // Ordenar por data de vencimento crescente
  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  || [];

  // Close new payment modal and refresh
  const handleNewPaymentSuccess = () => {
    setIsNewPaymentOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="mb-1 text-sm text-neutral-500">Gerenciar pagamentos</div>
        <h1 className="text-2xl font-semibold text-neutral-900">Pagamentos</h1>
        <p className="text-neutral-600 mt-1">Gerencie os pagamentos de aluguéis dos contratos</p>
      </div>

      {/* Payment summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-neutral-500">Pagamentos Recebidos</h3>
                <p className="text-2xl font-semibold text-neutral-900 mt-2">
                  {isLoadingPayments ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    formatCurrency(paymentStats.received)
                  )}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-neutral-500">Pagamentos Agendados</h3>
                <p className="text-2xl font-semibold text-neutral-900 mt-2">
                  {isLoadingPayments ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    formatCurrency(paymentStats.pending)
                  )}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                <BanknoteIcon className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-neutral-500">Pagamentos Vencidos</h3>
                <p className="text-2xl font-semibold text-neutral-900 mt-2">
                  {isLoadingPayments ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    formatCurrency(paymentStats.overdue)
                  )}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form section */}
      {isNewPaymentOpen && (
        <Card className="border border-neutral-200 shadow-sm mb-6">
          <CardContent className="p-5 pt-6">
            <h2 className="text-xl font-semibold mb-4">Cadastrar Novo Pagamento</h2>
            <PaymentForm 
              contracts={contracts || []}
              onSuccess={handleNewPaymentSuccess}
            />
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsNewPaymentOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs para modo de visualização */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            viewMode === "lista"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setViewMode("lista")}
        >
          Lista de Pagamentos
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            viewMode === "inquilino"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setViewMode("inquilino")}
        >
          Por Inquilino
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {viewMode === "lista" ? (
            <>
              <div className="relative flex-grow sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <Input
                  placeholder="Buscar pagamentos..."
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
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pago">Pagos</SelectItem>
                  <SelectItem value="pendente">Agendados</SelectItem>
                  <SelectItem value="vencido">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : (
            <Select 
              value={selectedTenantId?.toString() || "0"}
              onValueChange={(value) => setSelectedTenantId(value === "0" ? null : parseInt(value))}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Selecione um inquilino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos os inquilinos</SelectItem>
                {tenants?.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id.toString()}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {!isNewPaymentOpen && (
          <Button onClick={() => setIsNewPaymentOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Pagamento
          </Button>
        )}
      </div>

      {isLoadingPayments ? (
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
                  <Skeleton className="h-9 w-36" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-neutral-100 p-3 mb-4">
              <BanknoteIcon className="h-6 w-6 text-neutral-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-1">Nenhum pagamento encontrado</h3>
            <p className="text-neutral-500 max-w-md">
              {viewMode === "inquilino" && selectedTenantId
                ? "Este inquilino não possui pagamentos registrados."
                : (searchQuery || statusFilter !== 'todos')
                  ? "Não foram encontrados pagamentos correspondentes aos filtros aplicados. Tente alterar sua pesquisa."
                  : "Você ainda não cadastrou nenhum pagamento. Clique no botão 'Novo Pagamento' para começar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Contrato</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Parcela</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Inquilino</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Imóvel</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Vencimento</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Data Pagamento</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Valor</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => {
                const contractDetails = getContractDetails(payment.contractId);
                if (!contractDetails) return null;
                
                return (
                  <tr key={payment.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-800">#{payment.contractId}</td>
                    <td className="py-3 px-4 text-sm text-gray-800 font-medium">{payment.installmentNumber || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{contractDetails.tenant}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{contractDetails.property}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{formatDate(payment.dueDate)}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">
                      {payment.isPaid && payment.paymentDate ? formatDate(payment.paymentDate) : "-"}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">
                      {formatCurrency(payment.value)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant={payment.isPaid ? "default" : 
                          (new Date(payment.dueDate) < new Date() ? "destructive" : "secondary")}
                        className={payment.isPaid 
                          ? "bg-green-100 text-green-800 hover:bg-green-100" 
                          : new Date(payment.dueDate) < new Date() 
                            ? "bg-red-100 text-red-800 hover:bg-red-100" 
                            : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                        }
                      >
                        {payment.isPaid 
                          ? "Pago" 
                          : new Date(payment.dueDate) < new Date() 
                            ? "Vencido" 
                            : "Agendado"
                        }
                        {payment.isRestored && (
                          <span className="ml-1 text-blue-800 font-bold" title="Pagamento restaurado">(R)</span>
                        )}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center space-x-2">
                        {!payment.isPaid && (
                          <Button 
                            onClick={() => handleConfirmPayment(payment)}
                            className="bg-green-600 hover:bg-green-700 h-8 rounded-full px-3 py-1 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Pago
                          </Button>
                        )}
                        <Button
                          onClick={() => handleOpenReceiptDialog(payment)}
                          className="h-8 rounded-full px-3 py-1 text-xs"
                          variant="outline"
                        >
                          <Receipt className="h-3 w-3 mr-1" /> Recibo
                        </Button>
                        <Button
                          onClick={() => handleDeletePayment(payment.id)}
                          className="h-8 rounded-full px-3 py-1 text-xs bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* O diálogo foi removido pois agora o formulário é exibido diretamente na página */}

      {/* Confirm Payment Dialog */}
      <Dialog open={isConfirmPaymentOpen} onOpenChange={setIsConfirmPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Preencha os dados para confirmar o pagamento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="receiptNumber" className="text-sm font-medium">
                Número do Recibo
              </label>
              <Input 
                id="receiptNumber" 
                placeholder="Ex: REC-00001" 
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="paymentMethod" className="text-sm font-medium">
                Método de Pagamento
              </label>
              <Select 
                value={paymentMethod} 
                onValueChange={setPaymentMethod}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Selecione o método de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Depósito">Depósito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="paymentDate" className="text-sm font-medium">
                Data de Pagamento
              </label>
              <div className="flex flex-col space-y-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentDate ? format(new Date(paymentDate), "PPP", { locale: pt }) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={paymentDate ? new Date(paymentDate) : undefined}
                      onSelect={(date) => date && setPaymentDate(formatDateToISO(date))}
                      initialFocus
                      locale={pt}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Data em que o pagamento foi efetivamente realizado. Por padrão, é a data atual.
                </p>
              </div>
            </div>
            
            {selectedPayment && new Date(selectedPayment.dueDate) < new Date() && (
              <>
                <div className="space-y-2">
                  <label htmlFor="latePaymentFee" className="text-sm font-medium">
                    Multa por Atraso (R$)
                  </label>
                  <Input 
                    id="latePaymentFee" 
                    type="number"
                    step="0.01"
                    placeholder="0,00" 
                    value={latePaymentFee}
                    onChange={(e) => setLatePaymentFee(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor da multa por atraso no pagamento.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="interestAmount" className="text-sm font-medium">
                    Juros (R$)
                  </label>
                  <Input 
                    id="interestAmount" 
                    type="number"
                    step="0.01"
                    placeholder="0,00" 
                    value={interestAmount}
                    onChange={(e) => setInterestAmount(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor dos juros pelo período de atraso.
                  </p>
                </div>
              </>
            )}

            <div className="pt-4 flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setIsConfirmPaymentOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => {
                  if (selectedPayment && paymentMethod && receiptNumber) {
                    markAsPaidMutation.mutate({
                      id: selectedPayment.id,
                      paymentMethod,
                      receiptNumber,
                      paymentDate, // Incluir a data de pagamento selecionada
                      interestAmount,
                      latePaymentFee
                    });
                  } else {
                    toast({
                      title: "Campos obrigatórios",
                      description: "Preencha todos os campos para continuar",
                      variant: "destructive",
                    });
                  }
                }}
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={markAsPaidMutation.isPending}
              >
                {markAsPaidMutation.isPending ? "Confirmando..." : "Confirmar pagamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Payment Receipt Dialog */}
      {selectedPayment && (
        <PaymentReceiptDialog
          isOpen={isReceiptDialogOpen}
          onClose={() => setIsReceiptDialogOpen(false)}
          paymentId={selectedPayment.id}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Admin Password Dialog */}
      <AdminPasswordDialog
        isOpen={isAdminPasswordDialogOpen}
        onClose={() => setIsAdminPasswordDialogOpen(false)}
        onConfirm={handleAdminPasswordSubmit}
        isLoading={deletePaymentMutation.isPending}
        title="Operação Restrita"
        description="A exclusão de pagamentos requer autorização de administrador. Por favor, insira a senha de administrador para continuar."
      />
    </div>
  );
};

export default Payments;
