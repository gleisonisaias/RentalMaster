import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Plus, Search, Pencil, Trash2, X, UserRound, 
  Eye, EyeOff, ToggleLeft, ToggleRight, FileUp, Files,
  ClipboardList
} from "lucide-react";
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
import { Tenant } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tenantFormSchema } from "@/utils/validation";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddressForm from "@/components/ui/address-form";
import OptionalAddressForm from "@/components/ui/optional-address-form";
import { formatCPF, formatPhone } from "@/utils/validation";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUpload } from "@/components/document-upload";
import { TenantRegistrationFormDialog } from "@/components/tenant-registration-form-dialog";

type TenantFormValues = z.infer<typeof tenantFormSchema>;

const Tenants = () => {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGuarantor, setShowGuarantor] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [isRegistrationFormOpen, setIsRegistrationFormOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for new/edit tenant
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      document: "",
      rg: "",
      email: "",
      phone: "",
      nationality: "",
      profession: "",
      maritalStatus: "",
      spouseName: "",
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
        rg: "",
        phone: "",
        email: "",
        nationality: "",
        profession: "",
        maritalStatus: "",
        spouseName: "",
      },
    },
  });

  // Query para listar inquilinos com o parâmetro showInactive
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['/api/tenants', { showInactive }],
    queryFn: async () => {
      const url = `/api/tenants${showInactive ? '?showInactive=true' : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao buscar inquilinos');
      }
      return response.json();
    },
    onError: (error) => {
      toast({
        title: "Erro ao carregar inquilinos",
        description: "Não foi possível carregar a lista de inquilinos",
        variant: "destructive",
      });
    }
  });
  
  // Activate tenant mutation
  const activateTenantMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/tenants/${id}/activate`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inquilino ativado",
        description: "O inquilino foi ativado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', { showInactive }] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao ativar inquilino",
        description: error.message || "Ocorreu um erro ao ativar o inquilino",
        variant: "destructive",
      });
    }
  });
  
  // Deactivate tenant mutation
  const deactivateTenantMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/tenants/${id}/deactivate`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inquilino desativado",
        description: "O inquilino foi desativado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', { showInactive }] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao desativar inquilino",
        description: error.message || "Ocorreu um erro ao desativar o inquilino",
        variant: "destructive",
      });
    }
  });

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/tenants/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Inquilino removido",
        description: "O inquilino foi removido com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', { showInactive }] });
      setIsDeleteAlertOpen(false);
      setSelectedTenant(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover inquilino",
        description: error.message || "Ocorreu um erro ao remover o inquilino",
        variant: "destructive",
      });
    }
  });

  // Reset form and state
  const resetFormAndState = () => {
    form.reset({
      name: "",
      document: "",
      rg: "",
      email: "",
      phone: "",
      nationality: "",
      profession: "",
      maritalStatus: "",
      spouseName: "",
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
        rg: "",
        phone: "",
        email: "",
        nationality: "",
        profession: "",
        maritalStatus: "",
        spouseName: "",
      },
    });
    setShowForm(false);
    setIsEditing(false);
    setSelectedTenant(null);
    setShowGuarantor(false);
    setActiveTab("details");
  };
  
  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantFormValues) => {
      const response = await apiRequest('POST', '/api/tenants', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inquilino cadastrado",
        description: "O inquilino foi cadastrado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', { showInactive }] });
      resetFormAndState();
    },
    onError: (error) => {
      toast({
        title: "Erro ao cadastrar inquilino",
        description: error.message || "Ocorreu um erro ao cadastrar o inquilino",
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
        description: "O inquilino foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', { showInactive }] });
      resetFormAndState();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar inquilino",
        description: error.message || "Ocorreu um erro ao atualizar o inquilino",
        variant: "destructive",
      });
    }
  });
  
  // Form submission
  const onSubmit = async (data: TenantFormValues) => {
    try {
      // Se não tiver fiador, remova os dados do fiador
      if (!showGuarantor || !data.guarantor?.name) {
        data.guarantor = undefined;
      }
      
      if (isEditing && selectedTenant) {
        await updateTenantMutation.mutateAsync({ id: selectedTenant.id, data });
      } else {
        await createTenantMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };
  
  // Add new tenant
  const handleAddNewTenant = () => {
    setShowForm(true);
    setIsEditing(false);
    setSelectedTenant(null);
    setShowGuarantor(false);
    setActiveTab("details");
    
    // Reset the form
    form.reset({
      name: "",
      document: "",
      rg: "",
      email: "",
      phone: "",
      nationality: "",
      profession: "",
      maritalStatus: "",
      spouseName: "",
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
        rg: "",
        phone: "",
        email: "",
        nationality: "",
        profession: "",
        maritalStatus: "",
        spouseName: "",
      },
    });
  };
  
  // Edit tenant
  const handleEditTenant = (tenant: Tenant) => {
    setShowForm(true);
    setIsEditing(true);
    setSelectedTenant(tenant);
    setActiveTab("details");
    
    const hasGuarantor = tenant.guarantor && 
      (tenant.guarantor.name || tenant.guarantor.document || tenant.guarantor.phone);
    
    setShowGuarantor(!!hasGuarantor);
    
    // Parse address and guarantor if they're stored as strings
    const address = typeof tenant.address === 'string' 
      ? JSON.parse(tenant.address) 
      : tenant.address;
    
    const guarantor = typeof tenant.guarantor === 'string' 
      ? JSON.parse(tenant.guarantor) 
      : tenant.guarantor;
    
    // Set form values
    form.reset({
      ...tenant,
      address,
      guarantor: guarantor || {
        name: "",
        document: "",
        rg: "",
        phone: "",
        email: "",
        nationality: "",
        profession: "",
        maritalStatus: "",
        spouseName: "",
      },
    });
  };
  
  // Delete tenant
  const handleDeleteTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDeleteAlertOpen(true);
  };
  
  // Toggle tenant status
  const handleToggleTenantStatus = (tenant: Tenant) => {
    if (tenant.isActive) {
      deactivateTenantMutation.mutate(tenant.id);
    } else {
      activateTenantMutation.mutate(tenant.id);
    }
  };
  
  // Handle registration form
  const handleOpenRegistrationForm = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsRegistrationFormOpen(true);
  };
  
  // Format phone input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhone(e.target.value);
    form.setValue("phone", formattedPhone);
  };
  
  // Format document (CPF/CNPJ) input
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedDocument = formatCPF(e.target.value);
    form.setValue("document", formattedDocument);
  };
  
  // Format guarantor phone input
  const handleGuarantorPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhone(e.target.value);
    form.setValue("guarantor.phone", formattedPhone);
  };
  
  // Format guarantor document (CPF) input
  const handleGuarantorDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedDocument = formatCPF(e.target.value);
    form.setValue("guarantor.document", formattedDocument);
  };
  
  // Filter tenants by search query
  const filteredTenants = tenants
    ? tenants.filter(tenant => 
        // Mostrar todos os inquilinos se showInactive for true, ou apenas os ativos se for false
        (showInactive || tenant.isActive !== false) &&
        // Filtrar por termo de busca se houver pesquisa
        (!searchQuery || 
          tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tenant.document.includes(searchQuery) ||
          tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tenant.phone.includes(searchQuery)
        )
      )
    : [];

  // Função para baixar a ficha cadastral em branco
  const handleDownloadBlankRegistrationForm = () => {
    window.open('/api/tenant-registration-form/blank', '_blank');
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inquilinos</h1>
          <p className="text-neutral-600 mt-1">Gerenciar cadastros de inquilinos</p>
        </div>
      </div>

      {/* Form Card */}
      {showForm && (
        <Card className="border border-neutral-200 shadow-sm mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  {activeTab === "documents" && selectedTenant 
                    ? `Documentos de ${selectedTenant.name}` 
                    : isEditing 
                      ? "Editar Inquilino" 
                      : "Adicionar Inquilino"
                  }
                </CardTitle>
                <CardDescription>
                  {activeTab === "documents" && selectedTenant
                    ? "Gerencie os documentos do inquilino"
                    : isEditing 
                      ? "Atualize as informações do inquilino" 
                      : "Cadastre um novo inquilino no sistema"
                  }
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={resetFormAndState}
                title="Fechar formulário"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === "documents" && selectedTenant ? (
              <DocumentUpload tenantId={selectedTenant.id} />
            ) : (
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
                            <Input 
                              {...field} 
                              placeholder="José Silva" 
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
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
                            <Input {...field} type="email" placeholder="jose@exemplo.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Campos adicionais */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nacionalidade</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a nacionalidade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Brasileira">Brasileira</SelectItem>
                              <SelectItem value="Estrangeira">Estrangeira</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="profession"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profissão</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Engenheiro" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado Civil</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o estado civil" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                              <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                              <SelectItem value="Separado(a)">Separado(a)</SelectItem>
                              <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                              <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                              <SelectItem value="União Estável">União Estável</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="spouseName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Cônjuge</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nome do cônjuge (se casado)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <AddressForm control={form.control} namePrefix="address" />
                  
                  <div className="flex flex-row items-center space-x-2 py-4">
                    <Switch 
                      checked={showGuarantor} 
                      onCheckedChange={setShowGuarantor} 
                      id="add-guarantor"
                    />
                    <label
                      htmlFor="add-guarantor"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Adicionar fiador
                    </label>
                  </div>
                  
                  {showGuarantor && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-4 bg-slate-50 rounded-md border border-slate-200">
                      <div className="sm:col-span-2 mb-2">
                        <h3 className="font-medium text-slate-900">Dados do Fiador</h3>
                        <p className="text-sm text-slate-500">Preencha os dados do fiador/garantidor <span className="text-amber-600 font-medium">(todos os campos são opcionais)</span></p>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="guarantor.name"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Nome do Fiador</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="João Silva" 
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
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
                        name="guarantor.rg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RG do Fiador</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="12.345.678-9" 
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
                      
                      <FormField
                        control={form.control}
                        name="guarantor.nationality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nacionalidade do Fiador</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a nacionalidade" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Brasileira">Brasileira</SelectItem>
                                <SelectItem value="Estrangeira">Estrangeira</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="guarantor.profession"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Profissão do Fiador</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Engenheiro" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="guarantor.maritalStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado Civil do Fiador</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o estado civil" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                <SelectItem value="Separado(a)">Separado(a)</SelectItem>
                                <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                <SelectItem value="União Estável">União Estável</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="guarantor.spouseName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Cônjuge do Fiador</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nome do cônjuge (se casado)" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetFormAndState}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createTenantMutation.isPending || updateTenantMutation.isPending}
                    >
                      {(createTenantMutation.isPending || updateTenantMutation.isPending) 
                        ? "Salvando..." 
                        : "Salvar"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4 items-start md:items-center mb-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <Input
              placeholder="Buscar inquilinos..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              id="show-inactive-tenants" 
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <label 
              htmlFor="show-inactive-tenants" 
              className="text-sm cursor-pointer text-neutral-600"
            >
              {showInactive ? (
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" /> Mostrando inativos
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <EyeOff className="h-4 w-4" /> Mostrar inativos
                </span>
              )}
            </label>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleDownloadBlankRegistrationForm}
            variant="outline"
            size="sm"
            className="flex items-center"
            title="Baixar ficha cadastral em branco para preencher manualmente"
          >
            <ClipboardList className="h-4 w-4 mr-1" />
            Ficha em Branco
          </Button>
          <Button 
            onClick={handleAddNewTenant}
            disabled={showForm}
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar Inquilino
          </Button>
        </div>
      </div>

      {/* Tenants List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="border border-neutral-200 shadow-sm">
              <CardContent className="p-5">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <div className="flex justify-end mt-4">
                  <Skeleton className="h-9 w-20 mr-2" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-neutral-100 p-3 mb-4">
              <UserRound className="h-6 w-6 text-neutral-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-1">Nenhum inquilino encontrado</h3>
            <p className="text-neutral-500 max-w-md">
              {searchQuery 
                ? "Não foram encontrados inquilinos correspondentes à sua pesquisa. Tente com outros termos."
                : "Você ainda não cadastrou nenhum inquilino. Clique no botão 'Adicionar Inquilino' para começar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.map((tenant) => {
            const address = typeof tenant.address === 'string' 
              ? JSON.parse(tenant.address) 
              : tenant.address;
              
            const isInactive = tenant.isActive === false;
            
            return (
              <Card 
                key={tenant.id} 
                className={`border shadow-sm ${
                  isInactive 
                    ? "border-neutral-200 bg-neutral-50" 
                    : "border-neutral-200"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`text-lg font-medium ${
                      isInactive ? "text-neutral-500" : "text-neutral-900"
                    }`}>
                      {tenant.name}
                    </h3>
                    <div className={`text-xs rounded-full px-2 py-1 font-medium ${
                      isInactive 
                        ? "bg-neutral-100 text-neutral-500" 
                        : "bg-green-50 text-green-700"
                    }`}>
                      {isInactive ? "Inativo" : "Ativo"}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600 mb-1"><strong>CPF/CNPJ:</strong> {tenant.document}</p>
                  <p className="text-sm text-neutral-600 mb-1"><strong>Email:</strong> {tenant.email}</p>
                  <p className="text-sm text-neutral-600 mb-1"><strong>Telefone:</strong> {tenant.phone}</p>
                  <p className="text-sm text-neutral-600 mb-1 truncate">
                    <strong>Endereço:</strong> {address.street}, {address.number}
                    {address.complement && `, ${address.complement}`} - {address.city}/{address.state}
                  </p>
                  <div className="flex justify-between mt-4">
                    <Button 
                      variant={isInactive ? "outline" : "ghost"}
                      size="sm"
                      onClick={() => handleToggleTenantStatus(tenant)}
                      disabled={activateTenantMutation.isPending || deactivateTenantMutation.isPending}
                      className={`${isInactive ? "text-green-600 border-green-200 hover:bg-green-50" : "text-red-600 hover:bg-red-50"}`}
                    >
                      {isInactive ? (
                        <><ToggleRight className="h-4 w-4 mr-1" /> Ativar</>
                      ) : (
                        <><ToggleLeft className="h-4 w-4 mr-1" /> Desativar</>
                      )}
                    </Button>
                    <div className="flex">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mr-2"
                        onClick={() => handleEditTenant(tenant)}
                      >
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setActiveTab("documents");
                          setShowForm(true);
                          setIsEditing(false);
                        }}
                      >
                        <Files className="h-4 w-4 mr-1" /> Documentos
                      </Button>

                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteTenant(tenant)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o inquilino {selectedTenant?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedTenant && deleteTenantMutation.mutate(selectedTenant.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTenantMutation.isPending ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Registration Form Dialog */}
      {selectedTenant && (
        <TenantRegistrationFormDialog
          isOpen={isRegistrationFormOpen}
          onClose={() => setIsRegistrationFormOpen(false)}
          tenantId={selectedTenant.id}
        />
      )}
    </div>
  );
};

export default Tenants;