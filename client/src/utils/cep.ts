interface AddressData {
  zipCode: string;
  street: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export const searchCEP = async (cep: string): Promise<AddressData> => {
  try {
    // Remove non-digit characters
    const cleanCep = cep.replace(/\D/g, "");
    
    if (cleanCep.length !== 8) {
      throw new Error("CEP inválido");
    }

    const response = await fetch(`/api/cep/${cleanCep}`);
    
    if (!response.ok) {
      throw new Error("CEP não encontrado");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    throw error;
  }
};
