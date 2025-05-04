import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Contract, Owner, Tenant, Property } from "@shared/schema";
import { contractFormSchema } from "@/utils/validation";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateEndDate, formatDateToISO } from "@/utils/formatters";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useEffect, useState } from "react";

type ContractFormValues = z.infer<typeof contractFormSchema>;

interface ContractFormProps {
  owners?: Owner[];
  tenants?: Tenant[];
  properties?: Property[];
  initialData?: Contract | null;
  isEditing?: boolean;
  onSuccess: () => void;
}

export const ContractForm = ({ 
  owners = [], 
  tenants = [], 
  properties = [],
  initialData, 
  isEditing = false, 
  onSuccess 
}: ContractFormProps) => {
  const { toast } = useToast();
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  // Convert initialData for form
  const getDefaultValues = () => {
    if (!initialData) {
      // Data atual
      const today = new Date();
      
      // Data padrão para o primeiro pagamento (30 dias após a data atual)
      const defaultFirstPayment = new Date();
      defaultFirstPayment.setDate(today.getDate() + 30);
      
      return {
        ownerId: 0,
        tenantId: 0,
        propertyId: 0,
        startDate: formatDateToISO(today),
        endDate: "",
        duration: 12,
        rentValue: 0,
        firstPaymentDate: formatDateToISO(defaultFirstPayment),
        status: "ativo" as const,
        observations: "",
      };
    }

    return {
      ...initialData,
      startDate: formatDateToISO(new Date(initialData.startDate)),
      endDate: formatDateToISO(new Date(initialData.endDate)),
      firstPaymentDate: initialData.firstPaymentDate 
        ? formatDateToISO(new Date(initialData.firstPaymentDate))
        : formatDateToISO(new Date()), // Fallback para compatibilidade com contratos existentes
    };
  };

  // Form setup
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Watch form values for calculations and filtering
  const watchOwnerId = form.watch("ownerId");
  const watchStartDate = form.watch("startDate");
  const watchDuration = form.watch("duration");
  const watchPropertyId = form.watch("propertyId");

  // Filter properties based on selected owner
  useEffect(() => {
    if (watchOwnerId) {
      const ownerProperties = properties.filter(p => p.ownerId === watchOwnerId);
      setFilteredProperties(ownerProperties);
      
      // If the currently selected property doesn't belong to the new owner, reset it
      if (watchPropertyId && !ownerProperties.some(p => p.id === watchPropertyId)) {
        form.setValue("propertyId", 0);
      }
    } else {
      setFilteredProperties([]);
    }
  }, [watchOwnerId, properties, form, watchPropertyId]);

  // Update selected property details
  useEffect(() => {
    if (watchPropertyId) {
      const property = properties.find(p => p.id === watchPropertyId);
      if (property) {
        setSelectedProperty(property);
        form.setValue("rentValue", property.rentValue);
      }
    }
  }, [watchPropertyId, properties, form]);

  // Calculate end date based on start date and duration
  useEffect(() => {
    if (watchStartDate && watchDuration) {
      const endDate = calculateEndDate(watchStartDate, watchDuration);
      form.setValue("endDate", endDate);
    }
  }, [watchStartDate, watchDuration, form]);

  // Create contract mutation
  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormValues) => {
      const response = await apiRequest('POST', '/api/contracts', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contrato criado",
        description: "O contrato foi criado com sucesso",
      });
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar contrato",
        description: error.message || "Ocorreu um erro ao criar o contrato",
        variant: "destructive",
      });
    }
  });

  // Update contract mutation
  const updateContractMutation = useMutation({
    mutationFn: async (data: { id: number; data: ContractFormValues }) => {
      const response = await apiRequest('PATCH', `/api/contracts/${data.id}`, data.data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contrato atualizado",
        description: "O contrato foi atualizado com sucesso",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar contrato",
        description: error.message || "Ocorreu um erro ao atualizar o contrato",
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  const onSubmit = (data: ContractFormValues) => {
    // Format numeric values
    const formattedData = {
      ...data,
      ownerId: Number(data.ownerId),
      tenantId: Number(data.tenantId),
      propertyId: Number(data.propertyId),
      duration: Number(data.duration),
      rentValue: Number(data.rentValue),
      // Mantém a data do primeiro pagamento como string
    };

    if (isEditing && initialData) {
      updateContractMutation.mutate({ id: initialData.id, data: formattedData });
    } else {
      createContractMutation.mutate(formattedData);
    }
  };

  // Get property address to display
  const getPropertyAddress = () => {
    if (!selectedProperty) return "";
    
    const address = typeof selectedProperty.address === 'string' 
      ? JSON.parse(selectedProperty.address) 
      : selectedProperty.address;
    
    // Incluir o nome do imóvel no começo se ele existir
    const namePrefix = selectedProperty.name ? `${selectedProperty.name} - ` : '';
      
    return `${namePrefix}${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state}`;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proprietário</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(Number(value))} 
                  defaultValue={field.value ? String(field.value) : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o proprietário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={String(owner.id)}>
                        {owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="tenantId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inquilino</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(Number(value))} 
                  defaultValue={field.value ? String(field.value) : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o inquilino" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={String(tenant.id)}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="propertyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imóvel</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(Number(value))} 
                  defaultValue={field.value ? String(field.value) : undefined}
                  disabled={!watchOwnerId || filteredProperties.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !watchOwnerId 
                          ? "Selecione um proprietário primeiro" 
                          : filteredProperties.length === 0 
                          ? "Nenhum imóvel disponível para este proprietário" 
                          : "Selecione o imóvel"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredProperties.map((property) => {
                      const address = typeof property.address === 'string' 
                        ? JSON.parse(property.address) 
                        : property.address;
                        
                      return (
                        <SelectItem key={property.id} value={String(property.id)}>
                          {property.type.charAt(0).toUpperCase() + property.type.slice(1)} 
                          {property.name && <span className="font-semibold text-blue-600"> ({property.name})</span>} - {address.street}, {address.number}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {selectedProperty && (
            <FormItem>
              <FormLabel>Endereço do imóvel</FormLabel>
              <Input 
                value={getPropertyAddress()}
                readOnly
                className="bg-neutral-50"
              />
            </FormItem>
          )}
          
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de início</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duração (meses)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    min="1"
                    onChange={e => field.onChange(Number(e.target.value))}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de término</FormLabel>
                <FormControl>
                  <Input {...field} type="date" readOnly className="bg-neutral-50" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="rentValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do Aluguel (R$)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                      R$
                    </span>
                    <Input 
                      {...field} 
                      type="number" 
                      min="0" 
                      step="0.01"
                      className="pl-10" 
                      onChange={e => field.onChange(Number(e.target.value))}
                      value={field.value}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="firstPaymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data do primeiro pagamento</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="observations"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Observações adicionais sobre o contrato..."
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={createContractMutation.isPending || updateContractMutation.isPending}
          >
            {(createContractMutation.isPending || updateContractMutation.isPending) 
              ? "Salvando..." 
              : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
