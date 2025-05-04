import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Search, Pencil, Trash2, X, User, 
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight, 
  EyeOff, Eye 
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Owner } from "@shared/schema";
import { ownerFormSchema } from "@/utils/validation";
import { z } from "zod";
import AddressForm from "@/components/ui/address-form";
import { apiRequest } from "@/lib/queryClient";
import { formatCPF, formatPhone } from "@/utils/validation";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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

type OwnerFormValues = z.infer<typeof ownerFormSchema>;

const Owners = () => {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for new/edit owner
  const form = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerFormSchema),
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
    },
  });

  // Get all owners
  const { data: owners, isLoading } = useQuery<Owner[]>({
    queryKey: ['/api/owners', { showInactive }],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/owners?showInactive=${showInactive}`);
      return response.json();
    },
    onError: () => {
      toast({
        title: "Erro ao carregar proprietários",
        description: "Não foi possível carregar a lista de proprietários",
        variant: "destructive",
      });
    }
  });

  // Create owner mutation
  const createOwnerMutation = useMutation({
    mutationFn: async (data: OwnerFormValues) => {
      const response = await apiRequest('POST', '/api/owners', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Proprietário adicionado",
        description: "O proprietário foi adicionado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/owners'] });
      resetFormAndState();
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar proprietário",
        description: error.message || "Ocorreu um erro ao adicionar o proprietário",
        variant: "destructive",
      });
    }
  });

  // Update owner mutation
  const updateOwnerMutation = useMutation({
    mutationFn: async (data: { id: number; data: Partial<OwnerFormValues> }) => {
      const response = await apiRequest('PATCH', `/api/owners/${data.id}`, data.data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Proprietário atualizado",
        description: "O proprietário foi atualizado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/owners'] });
      resetFormAndState();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar proprietário",
        description: error.message || "Ocorreu um erro ao atualizar o proprietário",
        variant: "destructive",
      });
    }
  });

  // Delete owner mutation
  const deleteOwnerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/owners/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Proprietário removido",
        description: "O proprietário foi removido com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/owners'] });
      setIsDeleteAlertOpen(false);
      setSelectedOwner(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover proprietário",
        description: error.message || "Ocorreu um erro ao remover o proprietário",
        variant: "destructive",
      });
    }
  });
  
  // Activate owner mutation
  const activateOwnerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/owners/${id}/activate`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Proprietário ativado",
        description: "O proprietário foi ativado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/owners'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao ativar proprietário",
        description: error.message || "Ocorreu um erro ao ativar o proprietário",
        variant: "destructive",
      });
    }
  });
  
  // Deactivate owner mutation
  const deactivateOwnerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/owners/${id}/deactivate`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Proprietário desativado",
        description: "O proprietário foi desativado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/owners'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao desativar proprietário",
        description: error.message || "Ocorreu um erro ao desativar o proprietário",
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
    });
    setShowForm(false);
    setIsEditing(false);
    setSelectedOwner(null);
  };

  // Submit handler for new/edit owner
  const onSubmit = (data: OwnerFormValues) => {
    if (isEditing && selectedOwner) {
      updateOwnerMutation.mutate({ id: selectedOwner.id, data });
    } else {
      createOwnerMutation.mutate(data);
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
  
  // Handle toggling owner active status
  const handleToggleOwnerStatus = (owner: Owner) => {
    if (owner.isActive) {
      deactivateOwnerMutation.mutate(owner.id);
    } else {
      activateOwnerMutation.mutate(owner.id);
    }
  };

  // Open edit form with selected owner data
  const handleEditOwner = (owner: Owner) => {
    setSelectedOwner(owner);
    setIsEditing(true);
    
    // Format the data to match the form structure
    const formattedOwner = {
      ...owner,
      address: typeof owner.address === 'string' 
        ? JSON.parse(owner.address) 
        : owner.address
    };
    
    form.reset(formattedOwner);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open delete confirmation
  const handleDeleteOwner = (owner: Owner) => {
    setSelectedOwner(owner);
    setIsDeleteAlertOpen(true);
  };

  // Show new owner form
  const handleAddNewOwner = () => {
    resetFormAndState();
    setShowForm(true);
    setIsEditing(false);
  };

  // Filter owners based on search query
  const filteredOwners = owners?.filter(owner => 
    owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    owner.document.includes(searchQuery) ||
    owner.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="mb-1 text-sm text-neutral-500">Gerenciar cadastros</div>
        <h1 className="text-2xl font-semibold text-neutral-900">Proprietários</h1>
        <p className="text-neutral-600 mt-1">Gerenciar cadastros de proprietários de imóveis</p>
      </div>

      {/* Form Card */}
      {showForm && (
        <Card className="border border-neutral-200 shadow-sm mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{isEditing ? "Editar Proprietário" : "Adicionar Proprietário"}</CardTitle>
                <CardDescription>
                  {isEditing 
                    ? "Atualize as informações do proprietário" 
                    : "Cadastre um novo proprietário no sistema"}
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
                          <Input 
                            {...field} 
                            placeholder="12.345.678-9" 
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
                
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetFormAndState}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createOwnerMutation.isPending || updateOwnerMutation.isPending}
                  >
                    {(createOwnerMutation.isPending || updateOwnerMutation.isPending) 
                      ? "Salvando..." 
                      : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4 items-start md:items-center mb-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <Input
              placeholder="Buscar proprietários..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              id="show-inactive" 
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <label 
              htmlFor="show-inactive" 
              className="text-sm cursor-pointer text-neutral-600"
            >
              {showInactive ? (
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" /> Exibir inativos
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <EyeOff className="h-4 w-4" /> Ocultar inativos
                </span>
              )}
            </label>
          </div>
        </div>
        <Button 
          onClick={handleAddNewOwner}
          disabled={showForm}
        >
          <Plus className="mr-2 h-4 w-4" /> Adicionar Proprietário
        </Button>
      </div>

      {/* Owners List */}
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
      ) : filteredOwners.length === 0 ? (
        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-neutral-100 p-3 mb-4">
              <User className="h-6 w-6 text-neutral-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-1">Nenhum proprietário encontrado</h3>
            <p className="text-neutral-500 max-w-md">
              {searchQuery 
                ? "Não foram encontrados proprietários correspondentes à sua pesquisa. Tente com outros termos."
                : "Você ainda não cadastrou nenhum proprietário. Clique no botão 'Adicionar Proprietário' para começar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOwners.map((owner) => {
            const address = typeof owner.address === 'string' 
              ? JSON.parse(owner.address) 
              : owner.address;
              
            const isInactive = owner.isActive === false;
            
            return (
              <Card 
                key={owner.id} 
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
                      {owner.name}
                    </h3>
                    <div className={`text-xs rounded-full px-2 py-1 font-medium ${
                      isInactive 
                        ? "bg-neutral-100 text-neutral-500" 
                        : "bg-green-50 text-green-700"
                    }`}>
                      {isInactive ? "Inativo" : "Ativo"}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600 mb-1"><strong>CPF/CNPJ:</strong> {owner.document}</p>
                  {owner.rg && <p className="text-sm text-neutral-600 mb-1"><strong>RG:</strong> {owner.rg}</p>}
                  <p className="text-sm text-neutral-600 mb-1"><strong>Email:</strong> {owner.email}</p>
                  <p className="text-sm text-neutral-600 mb-1"><strong>Telefone:</strong> {owner.phone}</p>
                  <p className="text-sm text-neutral-600 mb-1 truncate">
                    <strong>Endereço:</strong> {address.street}, {address.number}
                    {address.complement && `, ${address.complement}`} - {address.city}/{address.state}
                  </p>
                  <div className="flex justify-between mt-4">
                    <Button 
                      variant={isInactive ? "outline" : "ghost"}
                      size="sm"
                      onClick={() => handleToggleOwnerStatus(owner)}
                      disabled={activateOwnerMutation.isPending || deactivateOwnerMutation.isPending}
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
                        onClick={() => handleEditOwner(owner)}
                      >
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteOwner(owner)}
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
              Tem certeza que deseja excluir este proprietário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedOwner && deleteOwnerMutation.mutate(selectedOwner.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOwnerMutation.isPending ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Owners;