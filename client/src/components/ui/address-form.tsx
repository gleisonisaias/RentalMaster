import { useState } from "react";
import { Control, useController } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Edit, Search } from "lucide-react";
import { z } from "zod";
import { addressSchema } from "@/utils/validation";
import { searchCEP } from "@/utils/cep";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  control: Control<any>;
  namePrefix: string;
}

const AddressForm = ({ control, namePrefix }: AddressFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  // Estado para controlar se os campos de endereço podem ser editados
  const [isGeneralCep, setIsGeneralCep] = useState(false);
  const { toast } = useToast();

  // Get controllers for each field
  const { field: zipCodeField } = useController({
    name: `${namePrefix}.zipCode`,
    control,
  });

  const { field: streetField } = useController({
    name: `${namePrefix}.street`,
    control,
  });

  const { field: numberField } = useController({
    name: `${namePrefix}.number`,
    control,
  });

  const { field: complementField } = useController({
    name: `${namePrefix}.complement`,
    control,
  });

  const { field: neighborhoodField } = useController({
    name: `${namePrefix}.neighborhood`,
    control,
  });

  const { field: cityField } = useController({
    name: `${namePrefix}.city`,
    control,
  });

  const { field: stateField } = useController({
    name: `${namePrefix}.state`,
    control,
  });

  const handleCepSearch = async () => {
    const cep = zipCodeField.value;
    if (!cep || cep.length !== 9) {
      toast({
        title: "CEP inválido",
        description: "Por favor, digite um CEP válido no formato 00000-000",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const addressData = await searchCEP(cep);
      if (addressData) {
        // Verificar se é um CEP geral (street e neighborhood vazios)
        const isGeneral = !addressData.street && !addressData.neighborhood;
        setIsGeneralCep(isGeneral);
        
        if (isGeneral) {
          // Caso seja um CEP geral, mantém os campos editáveis e exibe uma mensagem informativa
          toast({
            title: "CEP geral detectado",
            description: "Este CEP é de cidade geral. Edite manualmente os campos de endereço.",
          });
        }
        
        // Sempre atualiza os campos com o que retornou da API
        streetField.onChange(addressData.street);
        neighborhoodField.onChange(addressData.neighborhood);
        cityField.onChange(addressData.city);
        stateField.onChange(addressData.state);
      }
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível encontrar o endereço para este CEP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCep = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");
    
    // Format as 00000-000
    if (digits.length <= 5) {
      return digits;
    } else {
      return `${digits.substring(0, 5)}-${digits.substring(5, 8)}`;
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCep = formatCep(e.target.value);
    zipCodeField.onChange(formattedCep);
  };

  return (
    <>
      <h4 className="text-md font-medium text-neutral-700 mb-3 border-t border-neutral-200 pt-4">
        Informações de Endereço
      </h4>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={`${namePrefix}.zipCode`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <div className="relative">
                <Input
                  {...field}
                  placeholder="00000-000"
                  onChange={handleCepChange}
                  value={field.value || ""}
                  maxLength={9}
                  disabled={isLoading}
                  onBlur={(e) => {
                    field.onBlur();
                    if (e.target.value.length === 9) {
                      handleCepSearch();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-2 text-primary-500"
                  onClick={handleCepSearch}
                  disabled={isLoading}
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`${namePrefix}.street`}
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel>Rua</FormLabel>
                {isGeneralCep && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-blue-600 inline-flex items-center">
                          <Edit className="h-3 w-3 mr-1" />
                          Editável
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>CEP geral detectado. Este campo pode ser editado manualmente.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <Input
                {...field}
                placeholder="Nome da rua"
                readOnly={!isGeneralCep}
                className={!isGeneralCep ? "bg-neutral-50" : ""}
                value={field.value || ""}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`${namePrefix}.number`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número</FormLabel>
              <Input
                {...field}
                placeholder="123"
                value={field.value || ""}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`${namePrefix}.complement`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Complemento</FormLabel>
              <Input
                {...field}
                placeholder="Apto 101, Bloco A, etc."
                value={field.value || ""}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`${namePrefix}.neighborhood`}
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel>Bairro</FormLabel>
                {isGeneralCep && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-blue-600 inline-flex items-center">
                          <Edit className="h-3 w-3 mr-1" />
                          Editável
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>CEP geral detectado. Este campo pode ser editado manualmente.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <Input
                {...field}
                placeholder="Nome do bairro"
                readOnly={!isGeneralCep}
                className={!isGeneralCep ? "bg-neutral-50" : ""}
                value={field.value || ""}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`${namePrefix}.city`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <Input
                {...field}
                placeholder="Nome da cidade"
                readOnly={true}
                className="bg-neutral-50"
                value={field.value || ""}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`${namePrefix}.state`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Input
                {...field}
                placeholder="UF"
                readOnly={true}
                className="bg-neutral-50"
                value={field.value || ""}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
};

export default AddressForm;
