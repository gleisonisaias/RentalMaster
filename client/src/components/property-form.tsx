import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Property, Owner } from "@shared/schema";
import { propertyFormSchema } from "@/utils/validation";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddressForm from "@/components/ui/address-form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

interface PropertyFormProps {
  owners: Owner[];
  initialData?: Property | null;
  isEditing?: boolean;
  onSuccess: () => void;
}

export const PropertyForm = ({ 
  owners, 
  initialData, 
  isEditing = false, 
  onSuccess 
}: PropertyFormProps) => {
  const { toast } = useToast();

  // Convert initialData for form
  const getDefaultValues = () => {
    if (!initialData) {
      return {
        ownerId: 0,
        name: "",
        type: "apartamento" as const,
        rentValue: 0,
        bedrooms: 0,
        bathrooms: 0,
        area: 0,
        description: "",
        availableForRent: true,
        waterCompany: "",
        waterAccountNumber: "",
        electricityCompany: "",
        electricityAccountNumber: "",
        address: {
          zipCode: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
        },
      };
    }

    console.log("Dados iniciais recebidos:", initialData);
    
    // Parse address from string if needed
    const address = typeof initialData.address === 'string' 
      ? JSON.parse(initialData.address) 
      : initialData.address;

    // Garantir que todos os campos estejam presentes com valores apropriados
    return {
      ownerId: initialData.ownerId,
      name: initialData.name || "",
      type: initialData.type,
      rentValue: initialData.rentValue || 0,
      bedrooms: initialData.bedrooms || 0,
      bathrooms: initialData.bathrooms || 0,
      area: initialData.area || 0,
      description: initialData.description || "",
      availableForRent: initialData.availableForRent !== undefined ? initialData.availableForRent : true,
      waterCompany: initialData.waterCompany || "",
      waterAccountNumber: initialData.waterAccountNumber || "",
      electricityCompany: initialData.electricityCompany || "",
      electricityAccountNumber: initialData.electricityAccountNumber || "",
      address: address,
      isActive: initialData.isActive !== undefined ? initialData.isActive : true,
    };
  };

  // Form setup
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Create property mutation
  const createPropertyMutation = useMutation({
    mutationFn: async (data: PropertyFormValues) => {
      const response = await apiRequest('POST', '/api/properties', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Imóvel adicionado",
        description: "O imóvel foi adicionado com sucesso",
      });
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar imóvel",
        description: error.message || "Ocorreu um erro ao adicionar o imóvel",
        variant: "destructive",
      });
    }
  });

  // Update property mutation
  const updatePropertyMutation = useMutation({
    mutationFn: async (data: { id: number; data: PropertyFormValues }) => {
      // Converter o tipo para string para garantir que está no formato correto
      const formattedData = {
        ...data.data,
        type: data.data.type as string // Forçar como string para compatibilidade com a API
      };
      
      console.log("Enviando atualização para o servidor - ID:", data.id);
      console.log("Dados formatados:", formattedData);
      
      const response = await apiRequest('PATCH', `/api/properties/${data.id}`, formattedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Imóvel atualizado",
        description: "O imóvel foi atualizado com sucesso",
      });
      onSuccess();
    },
    onError: (error) => {
      console.error("Erro na atualização:", error);
      toast({
        title: "Erro ao atualizar imóvel",
        description: error.message || "Ocorreu um erro ao atualizar o imóvel",
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  const onSubmit = (data: PropertyFormValues) => {
    // Format numeric values
    const formattedData = {
      ...data,
      rentValue: Number(data.rentValue),
      bedrooms: Number(data.bedrooms || 0),
      bathrooms: Number(data.bathrooms || 0),
      area: Number(data.area || 0),
    };

    console.log("Enviando dados do imóvel:", formattedData);
    
    if (isEditing && initialData) {
      console.log("Modo edição - ID:", initialData.id);
      updatePropertyMutation.mutate({ id: initialData.id, data: formattedData });
    } else {
      console.log("Modo criação");
      createPropertyMutation.mutate(formattedData);
    }
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
                <FormLabel>Proprietário *</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(Number(value))} 
                  defaultValue={field.value ? String(field.value) : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um proprietário" />
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Imóvel</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="Nome para identificação (ex: Casa 1, Apto Principal, etc.)"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
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
                <FormLabel>Tipo de Imóvel *</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="terreno">Terreno</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="rentValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do Aluguel (R$) *</FormLabel>
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
            name="bedrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quartos</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    min="0"
                    onChange={e => field.onChange(Number(e.target.value))}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="bathrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banheiros</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    min="0"
                    onChange={e => field.onChange(Number(e.target.value))}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Área (m²)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    min="0"
                    onChange={e => field.onChange(Number(e.target.value))}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="availableForRent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Disponível para locação</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Descrição e detalhes característicos, etc."
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <AddressForm control={form.control} namePrefix="address" />
        
        {/* Informações de Concessionárias */}
        <div className="space-y-4 border-t border-neutral-200 pt-4">
          <h4 className="text-md font-medium text-neutral-700 mb-3">
            Informações de Concessionárias
          </h4>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="waterCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa de Água</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome da concessionária" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="waterAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número da Conta de Água</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Número da conta/cliente" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="electricityCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa de Energia Elétrica</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome da concessionária" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="electricityAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número da Conta de Energia</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Número da conta/cliente" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
            disabled={createPropertyMutation.isPending || updatePropertyMutation.isPending}
          >
            {(createPropertyMutation.isPending || updatePropertyMutation.isPending) 
              ? "Salvando..." 
              : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
