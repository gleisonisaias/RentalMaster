import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { Tenant } from "@shared/schema";
import { tenantFormSchema } from "@/utils/validation";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddressForm from "@/components/ui/address-form";
import { formatCPF, formatPhone } from "@/utils/validation";
import { useState } from "react";

type TenantFormValues = z.infer<typeof tenantFormSchema>;

interface TenantFormProps {
  initialData?: Tenant | null;
  isEditing?: boolean;
  onSuccess: () => void;
}

export const TenantForm = ({ initialData, isEditing = false, onSuccess }: TenantFormProps) => {
  const [showGuarantor, setShowGuarantor] = useState(
    initialData?.guarantor ? true : false
  );
  const { toast } = useToast();

  // Convert initialData for form
  const getDefaultValues = () => {
    if (!initialData) {
      return {
        name: "",
        document: "",
        rg: "",
        email: "",
        phone: "",
        address: {
          zipCode: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
        },
        guarantor: {
          name: "",
          document: "",
          phone: "",
          email: "",
        },
      };
    }

    // Parse address from string if needed
    const address = typeof initialData.address === 'string' 
      ? JSON.parse(initialData.address) 
      : initialData.address;

    // Parse guarantor from string if needed
    const guarantor = initialData.guarantor && typeof initialData.guarantor === 'string'
      ? JSON.parse(initialData.guarantor)
      : initialData.guarantor || {
          name: "",
          document: "",
          phone: "",
          email: "",
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

    return {
      ...initialData,
      address,
      guarantor,
    };
  };

  // Form setup
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantFormValues) => {
      const response = await apiRequest('POST', '/api/tenants', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inquilino adicionado",
        description: "O inquilino foi adicionado com sucesso",
      });
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar inquilino",
        description: error.message || "Ocorreu um erro ao adicionar o inquilino",
        variant: "destructive",
      });
    }
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async (data: { id: number; data: TenantFormValues }) => {
      const response = await apiRequest('PATCH', `/api/tenants/${data.id}`, data.data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inquilino atualizado",
        description: "O inquilino foi atualizado com sucesso",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar inquilino",
        description: error.message || "Ocorreu um erro ao atualizar o inquilino",
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  const onSubmit = (data: TenantFormValues) => {
    // If guarantor section is hidden or empty, remove guarantor data
    if (!showGuarantor || !data.guarantor?.name) {
      data.guarantor = undefined;
    }

    if (isEditing && initialData) {
      updateTenantMutation.mutate({ id: initialData.id, data });
    } else {
      createTenantMutation.mutate(data);
    }
  };

  // Handle document (CPF) input mask
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCPF = formatCPF(e.target.value);
    form.setValue("document", formattedCPF);
  };

  // Handle phone input mask
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhone(e.target.value);
    form.setValue("phone", formattedPhone);
  };

  // Handle guarantor document input mask
  const handleGuarantorDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCPF = formatCPF(e.target.value);
    form.setValue("guarantor.document", formattedCPF);
  };

  // Handle guarantor phone input mask
  const handleGuarantorPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhone(e.target.value);
    form.setValue("guarantor.phone", formattedPhone);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Nome completo</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Maria Santos" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="rg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RG</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="12.345.678-9" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="document"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF/CNPJ</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="123.456.789-00" 
                    onChange={handleDocumentChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="(11) 98765-4321" 
                    onChange={handlePhoneChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="maria@exemplo.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <AddressForm control={form.control} namePrefix="address" />
        
        <div className="border-t border-neutral-200 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-neutral-700">Informações do Fiador (Opcional)</h4>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setShowGuarantor(!showGuarantor)}
            >
              {showGuarantor ? "Ocultar" : "Adicionar Fiador"}
            </Button>
          </div>
          
          {showGuarantor && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="guarantor.name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nome do Fiador</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="João Silva" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="guarantor.document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF do Fiador</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="123.456.789-00" 
                        onChange={handleGuarantorDocumentChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="guarantor.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone do Fiador</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="(11) 98765-4321" 
                        onChange={handleGuarantorPhoneChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="guarantor.email"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Email do Fiador</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="joao@exemplo.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Endereço do Fiador */}
              <div className="sm:col-span-2 pt-2 mt-2 border-t border-neutral-200">
                <h5 className="text-sm font-medium text-neutral-700 mb-3">
                  Endereço do Fiador
                </h5>
                <AddressForm 
                  control={form.control} 
                  namePrefix="guarantor.address"
                />
              </div>
            </div>
          )}
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
            disabled={createTenantMutation.isPending || updateTenantMutation.isPending}
          >
            {(createTenantMutation.isPending || updateTenantMutation.isPending) ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
