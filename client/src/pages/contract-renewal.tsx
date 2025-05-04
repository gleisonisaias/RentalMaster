import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, ArrowLeftIcon } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, parseDate } from "@/lib/formatters";
import { RenewalPDFButton } from "@/components/renewal-pdf-button";

// Schema de validação
const contractRenewalSchema = z.object({
  originalContractId: z.number(),
  startDate: z.string().min(1, { message: "A data de início é obrigatória" }),
  endDate: z.string().min(1, { message: "A data de término é obrigatória" }),
  renewalDate: z.string().min(1, { message: "A data de renovação é obrigatória" }),
  newRentValue: z.coerce.number().min(1, { message: "O valor do aluguel é obrigatório" }),
  adjustmentIndex: z.string().min(1, { message: "O índice de reajuste é obrigatório" }),
  observations: z.string().nullable().optional(),
});

// Tipo do formulário
type ContractRenewalFormValues = z.infer<typeof contractRenewalSchema>;

// Definição de tipos para o contrato
interface Contract {
  id: number;
  ownerId: number;
  tenantId: number;
  propertyId: number;
  startDate: string;
  endDate: string;
  duration: number;
  rentValue: number;
  paymentDay: number;
  status: string;
  observations: string | null;
}

// Definição de tipos para o proprietário
interface Owner {
  id: number;
  name: string;
  document: string;
  email: string;
  phone: string;
}

// Definição de tipos para o inquilino
interface Tenant {
  id: number;
  name: string;
  document: string;
  email: string;
  phone: string;
}

// Definição de tipos para o imóvel
interface Property {
  id: number;
  type: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export default function ContractRenewalPage() {
  const { contractId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [renewalId, setRenewalId] = useState<number | null>(null);

  // Definir datas padrão
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextYear = new Date(today);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  // Buscar contrato original
  const { data: contract, isLoading: isLoadingContract } = useQuery({
    queryKey: ['/api/contracts', Number(contractId)],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/contracts/${contractId}`);
      const data = await response.json();
      return data;
    },
    onError: (error) => {
      toast({
        title: "Erro ao carregar contrato",
        description: error.message || "Não foi possível carregar os dados do contrato",
        variant: "destructive",
      });
      navigate('/contratos');
    }
  });

  // Buscar proprietário
  const { data: owner, isLoading: isLoadingOwner } = useQuery({
    queryKey: ['/api/owners', contract?.ownerId],
    queryFn: async () => {
      if (!contract?.ownerId) throw new Error("ID do proprietário não encontrado");
      const response = await apiRequest('GET', `/api/owners/${contract.ownerId}`);
      const data = await response.json();
      return data;
    },
    enabled: !!contract?.ownerId,
  });

  // Buscar inquilino
  const { data: tenant, isLoading: isLoadingTenant } = useQuery({
    queryKey: ['/api/tenants', contract?.tenantId],
    queryFn: async () => {
      if (!contract?.tenantId) throw new Error("ID do inquilino não encontrado");
      const response = await apiRequest('GET', `/api/tenants/${contract.tenantId}`);
      const data = await response.json();
      return data;
    },
    enabled: !!contract?.tenantId,
  });

  // Buscar imóvel
  const { data: property, isLoading: isLoadingProperty } = useQuery({
    queryKey: ['/api/properties', contract?.propertyId],
    queryFn: async () => {
      if (!contract?.propertyId) throw new Error("ID do imóvel não encontrado");
      const response = await apiRequest('GET', `/api/properties/${contract.propertyId}`);
      const data = await response.json();
      return data;
    },
    enabled: !!contract?.propertyId,
  });

  // Função para adicionar dias a uma data
  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(date.getDate() + days);
    return result;
  }

  // Criar formulário
  const form = useForm<ContractRenewalFormValues>({
    resolver: zodResolver(contractRenewalSchema),
    defaultValues: {
      originalContractId: Number(contractId),
      startDate: contract?.endDate ? 
        (() => {
          const endDate = new Date(contract.endDate);
          const nextDay = addDays(endDate, 1);
          return nextDay.toISOString().split('T')[0];
        })() : 
        today.toISOString().split('T')[0],
      endDate: contract?.endDate ? 
        (() => {
          const endDate = new Date(contract.endDate);
          const nextYear = new Date(endDate);
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          return nextYear.toISOString().split('T')[0];
        })() : 
        nextYear.toISOString().split('T')[0],
      renewalDate: today.toISOString().split('T')[0],
      newRentValue: contract?.rentValue || 0,
      adjustmentIndex: "IGPM",
      observations: "",
    },
  });

  // Atualizar valores padrão quando o contrato for carregado
  useEffect(() => {
    if (contract) {
      const endDate = new Date(contract.endDate);
      const nextDay = addDays(endDate, 1);
      const nextYear = new Date(nextDay);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      
      form.setValue("originalContractId", contract.id);
      form.setValue("startDate", nextDay.toISOString().split('T')[0]);
      form.setValue("endDate", nextYear.toISOString().split('T')[0]);
      form.setValue("newRentValue", contract.rentValue);
    }
  }, [contract, form]);

  // Mutação para criar renovação
  const createRenewalMutation = useMutation({
    mutationFn: async (data: ContractRenewalFormValues) => {
      const response = await apiRequest('POST', '/api/contract-renewals', data);
      return response.json();
    },
    onSuccess: (result) => {
      // O resultado deve incluir o ID da renovação criada
      if (result && result.renewal && result.renewal.id) {
        setRenewalId(result.renewal.id);
      }
      
      toast({
        title: "Renovação criada com sucesso",
        description: "O contrato foi renovado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      
      // Não redirecionar automaticamente para permitir baixar o PDF
      // navigate('/contratos');
    },
    onError: (error) => {
      toast({
        title: "Erro ao renovar contrato",
        description: error.message || "Ocorreu um erro ao renovar o contrato",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = async (data: ContractRenewalFormValues) => {
    createRenewalMutation.mutate(data);
  };

  // Exibir spinner de carregamento enquanto os dados estão sendo carregados
  if (isLoadingContract || isLoadingOwner || isLoadingTenant || isLoadingProperty) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Se o contrato não for encontrado
  if (!contract) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Contrato não encontrado</h2>
        <p className="text-neutral-600 mb-4">O contrato solicitado não foi encontrado no sistema.</p>
        <Button variant="outline" onClick={() => navigate('/contratos')}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Voltar para Contratos
        </Button>
      </div>
    );
  }

  // Processar informações do endereço se disponível
  const address = property ? (
    typeof property.address === 'string'
      ? JSON.parse(property.address)
      : property.address
  ) : null;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/contratos')}
          className="mb-4"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Voltar para Contratos
        </Button>
        
        <div className="mb-1 text-sm text-neutral-500">Renovação de Contrato</div>
        <h1 className="text-2xl font-semibold text-neutral-900">Renovar Contrato #{contract.id}</h1>
        <p className="text-neutral-600 mt-1">Preencha os dados para renovar o contrato</p>
      </div>

      {/* Resumo do contrato atual */}
      <Card className="mb-6">
        <CardContent className="p-5 pt-6">
          <h2 className="text-lg font-semibold mb-4">Informações do Contrato Atual</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm font-medium text-neutral-500">Proprietário</div>
              <div className="text-neutral-900">{owner?.name}</div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-neutral-500">Inquilino</div>
              <div className="text-neutral-900">{tenant?.name}</div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-neutral-500">Imóvel</div>
              <div className="text-neutral-900">
                {address ? 
                  `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state}` : 
                  'Endereço não disponível'}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-neutral-500">Período Atual</div>
              <div className="text-neutral-900">
                {formatDate(contract.startDate)} a {formatDate(contract.endDate)}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-neutral-500">Duração</div>
              <div className="text-neutral-900">
                {contract.duration} {contract.duration > 1 ? 'meses' : 'mês'}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-neutral-500">Valor Atual</div>
              <div className="text-neutral-900">
                {formatCurrency(contract.rentValue)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de renovação */}
      <Card>
        <CardContent className="p-5 pt-6">
          <h2 className="text-lg font-semibold mb-4">Dados da Renovação</h2>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data de início */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Início</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl className="flex-1">
                          <Input
                            type="date"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="DD/MM/AAAA"
                          />
                        </FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant={"outline"}
                              className="px-2"
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString().split('T')[0] || '')}
                              initialFocus
                              // Sem restrição de datas para permitir selecionar datas anteriores
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data de término */}
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Término</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl className="flex-1">
                          <Input
                            type="date"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="DD/MM/AAAA"
                          />
                        </FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant={"outline"}
                              className="px-2"
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString().split('T')[0] || '')}
                              disabled={(date) => {
                                const startDate = new Date(form.getValues().startDate);
                                return date <= startDate;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data de renovação */}
                <FormField
                  control={form.control}
                  name="renewalDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data da Renovação</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl className="flex-1">
                          <Input
                            type="date"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="DD/MM/AAAA"
                          />
                        </FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant={"outline"}
                              className="px-2"
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString().split('T')[0] || '')}
                              initialFocus
                              // Sem restrição de datas passadas para permitir datas anteriores
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Escolha ou digite uma data (mesmo que seja anterior à data atual)
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Novo valor do aluguel */}
                <FormField
                  control={form.control}
                  name="newRentValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Novo Valor do Aluguel</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="R$ 0,00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Índice de reajuste */}
                <FormField
                  control={form.control}
                  name="adjustmentIndex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Índice de Reajuste</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um índice" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IGPM">IGPM</SelectItem>
                          <SelectItem value="IPCA">IPCA</SelectItem>
                          <SelectItem value="INPC">INPC</SelectItem>
                          <SelectItem value="OUTRO">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Observações */}
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações sobre a renovação do contrato"
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/contratos')}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createRenewalMutation.isPending}
                >
                  {createRenewalMutation.isPending ? "Processando..." : "Renovar Contrato"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Exibir botão para baixar PDF após criação bem-sucedida da renovação */}
      {renewalId && (
        <div className="fixed bottom-6 right-6 left-6 z-50">
          <Card className="shadow-lg border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between">
                <div className="mb-4 sm:mb-0">
                  <h3 className="text-lg font-semibold text-green-800">Termo Aditivo Gerado com Sucesso</h3>
                  <p className="text-green-700">
                    Clique no botão ao lado para baixar o documento.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <RenewalPDFButton 
                    renewalId={renewalId} 
                    variant="default"
                    customClass="bg-green-600 hover:bg-green-700"
                  />
                  
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/contratos')}
                    className="border-green-300"
                  >
                    Voltar para Contratos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}