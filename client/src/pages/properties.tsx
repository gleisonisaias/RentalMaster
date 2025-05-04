import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Home, Ban, Check } from "lucide-react";
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
import { Property, Owner } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { PropertyForm } from "@/components/property-form";
import { formatCurrency, formatPropertyType, formatPropertyAddress } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Properties = () => {
  const [isNewPropertyOpen, setIsNewPropertyOpen] = useState(false);
  const [isEditPropertyOpen, setIsEditPropertyOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all properties
  const { data: properties, isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: ['/api/properties', { showInactive }],
    queryFn: async () => {
      const res = await fetch(`/api/properties${showInactive ? '?showInactive=true' : ''}`);
      if (!res.ok) {
        throw new Error('Falha ao carregar imóveis');
      }
      return res.json();
    },
    onError: () => {
      toast({
        title: "Erro ao carregar imóveis",
        description: "Não foi possível carregar a lista de imóveis",
        variant: "destructive",
      });
    }
  });

  // Get all owners for property form
  const { data: owners } = useQuery<Owner[]>({
    queryKey: ['/api/owners'],
    onError: () => {
      toast({
        title: "Erro ao carregar proprietários",
        description: "Não foi possível carregar a lista de proprietários",
        variant: "destructive",
      });
    }
  });

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/properties/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Imóvel removido",
        description: "O imóvel foi removido com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      setIsDeleteAlertOpen(false);
      setSelectedProperty(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover imóvel",
        description: error.message || "Ocorreu um erro ao remover o imóvel",
        variant: "destructive",
      });
    }
  });
  
  // Activate property mutation
  const activatePropertyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/properties/${id}/activate`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Imóvel ativado",
        description: "O imóvel foi ativado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao ativar imóvel",
        description: error.message || "Ocorreu um erro ao ativar o imóvel",
        variant: "destructive",
      });
    }
  });
  
  // Deactivate property mutation
  const deactivatePropertyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/properties/${id}/deactivate`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Imóvel desativado",
        description: "O imóvel foi desativado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao desativar imóvel",
        description: error.message || "Ocorreu um erro ao desativar o imóvel",
        variant: "destructive",
      });
    }
  });

  // Open edit modal with selected property data
  const handleEditProperty = (property: Property) => {
    setSelectedProperty(property);
    setIsEditPropertyOpen(true);
  };

  // Open delete confirmation
  const handleDeleteProperty = (property: Property) => {
    setSelectedProperty(property);
    setIsDeleteAlertOpen(true);
  };

  // Close new property modal and refresh
  const handleNewPropertySuccess = () => {
    setIsNewPropertyOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
  }

  // Close edit property modal and refresh
  const handleEditPropertySuccess = () => {
    setIsEditPropertyOpen(false);
    setSelectedProperty(null);
    queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
  }

  // Find owner name by ID
  const getOwnerName = (ownerId: number) => {
    const owner = owners?.find(owner => owner.id === ownerId);
    return owner ? owner.name : 'Proprietário não encontrado';
  };

  // Filter properties based on search query
  const filteredProperties = properties?.filter(property => {
    const address = typeof property.address === 'string' 
      ? JSON.parse(property.address) 
      : property.address;
    
    const ownerName = getOwnerName(property.ownerId).toLowerCase();
    const propertyType = formatPropertyType(property.type).toLowerCase();
    const propertyName = property.name ? property.name.toLowerCase() : '';
    const searchLower = searchQuery.toLowerCase();
    
    return (
      ownerName.includes(searchLower) ||
      propertyType.includes(searchLower) ||
      propertyName.includes(searchLower) ||
      address.street.toLowerCase().includes(searchLower) ||
      address.city.toLowerCase().includes(searchLower) ||
      address.neighborhood.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="mb-1 text-sm text-neutral-500">Gerenciar imóveis</div>
        <h1 className="text-2xl font-semibold text-neutral-900">Imóveis</h1>
        <p className="text-neutral-600 mt-1">Gerencie informações dos imóveis disponíveis para locação</p>
      </div>

      {/* Form section */}
      {(isNewPropertyOpen || isEditPropertyOpen) && (
        <Card className="border border-neutral-200 shadow-sm mb-6">
          <CardContent className="p-5 pt-6">
            <h2 className="text-xl font-semibold mb-4">
              {isEditPropertyOpen ? "Editar Imóvel" : "Cadastrar Novo Imóvel"}
            </h2>
            <PropertyForm 
              owners={owners || []} 
              onSuccess={isEditPropertyOpen ? handleEditPropertySuccess : handleNewPropertySuccess}
              initialData={isEditPropertyOpen ? selectedProperty : null}
              isEditing={isEditPropertyOpen}
            />
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsNewPropertyOpen(false);
                  setIsEditPropertyOpen(false);
                  setSelectedProperty(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="flex items-center gap-4 w-full">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <Input
              placeholder="Buscar imóveis por endereço ou tipo..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600">Mostrar inativos</span>
                    <Switch
                      checked={showInactive}
                      onCheckedChange={(checked) => {
                        setShowInactive(checked);
                        // Atualizar a consulta quando o interruptor for alterado
                        queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mostrar imóveis desativados</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {!isNewPropertyOpen && !isEditPropertyOpen && (
          <Button onClick={() => setIsNewPropertyOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Imóvel
          </Button>
        )}
      </div>

      {isLoadingProperties ? (
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
      ) : filteredProperties.length === 0 && !searchQuery ? (
        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-neutral-100 p-3 mb-4">
              <Home className="h-6 w-6 text-neutral-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-1">Nenhum imóvel encontrado</h3>
            <p className="text-neutral-500 max-w-md">
              {searchQuery 
                ? "Não foram encontrados imóveis correspondentes à sua pesquisa. Tente com outros termos."
                : "Você ainda não cadastrou nenhum imóvel. Clique no botão 'Novo Imóvel' para começar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map((property) => {
            const address = typeof property.address === 'string' 
              ? JSON.parse(property.address) 
              : property.address;
              
            return (
              <Card 
                key={property.id} 
                className={`border shadow-sm ${!property.isActive ? 'bg-neutral-50 border-dashed border-neutral-300' : 'border-neutral-200'}`}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-lg font-medium ${property.isActive ? 'text-neutral-900' : 'text-neutral-500'}`}>
                        {formatPropertyType(property.type)}
                      </h3>
                      {!property.isActive && (
                        <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <Badge variant={property.availableForRent ? "default" : "secondary"}>
                      {property.availableForRent ? "Disponível" : "Ocupado"}
                    </Badge>
                  </div>
                  {property.name && (
                    <p className={`text-sm ${property.isActive ? 'text-blue-600' : 'text-blue-400'} mb-1 font-semibold`}>
                      {property.name}
                    </p>
                  )}
                  <p className={`text-sm ${property.isActive ? 'text-neutral-600' : 'text-neutral-500'} mb-3 font-medium`}>
                    {address.street}, {address.number}
                    {address.complement && `, ${address.complement}`}
                  </p>
                  <p className={`text-sm ${property.isActive ? 'text-neutral-600' : 'text-neutral-500'} mb-1`}>
                    {address.neighborhood} - {address.city}/{address.state}
                  </p>
                  <p className={`text-sm ${property.isActive ? 'text-neutral-600' : 'text-neutral-500'} mb-1`}>
                    <strong>Proprietário:</strong> {getOwnerName(property.ownerId)}
                  </p>
                  <p className={`text-sm ${property.isActive ? 'text-neutral-600' : 'text-neutral-500'} mb-1`}>
                    <strong>Valor do Aluguel:</strong> {formatCurrency(property.rentValue)}
                  </p>
                  
                  <div className="flex gap-2 mt-2 mb-3">
                    {property.bedrooms && (
                      <Badge variant="outline" className="text-xs">
                        {property.bedrooms} {property.bedrooms > 1 ? 'Quartos' : 'Quarto'}
                      </Badge>
                    )}
                    {property.bathrooms && (
                      <Badge variant="outline" className="text-xs">
                        {property.bathrooms} {property.bathrooms > 1 ? 'Banheiros' : 'Banheiro'}
                      </Badge>
                    )}
                    {property.area && (
                      <Badge variant="outline" className="text-xs">
                        {property.area}m²
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-end mt-4">
                    {/* Botão de ativar/desativar */}
                    {property.isActive ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deactivatePropertyMutation.mutate(property.id)}
                              disabled={deactivatePropertyMutation.isPending}
                            >
                              <Ban className="h-4 w-4 mr-1 text-amber-600" /> 
                              {deactivatePropertyMutation.isPending ? "Desativando..." : "Desativar"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Desativar imóvel (ficará oculto por padrão)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => activatePropertyMutation.mutate(property.id)}
                              disabled={activatePropertyMutation.isPending}
                              className="border-green-200 text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4 mr-1 text-green-600" /> 
                              {activatePropertyMutation.isPending ? "Ativando..." : "Ativar"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reativar imóvel</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditProperty(property)}
                    >
                      <Pencil className="h-4 w-4 mr-1" /> Editar
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteProperty(property)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Os diálogos foram removidos pois agora o formulário é exibido diretamente na página */}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedProperty && deletePropertyMutation.mutate(selectedProperty.id)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deletePropertyMutation.isPending ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Properties;
