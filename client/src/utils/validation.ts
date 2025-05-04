import { z } from "zod";

// Address schema
export const addressSchema = z.object({
  zipCode: z.string().min(1, "CEP é obrigatório"),
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
});

// Esquema de endereço opcional para o fiador
export const optionalAddressSchema = z.object({
  zipCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

// CPF Validation
export const validateCPF = (cpf: string): boolean => {
  // Remove non-digits
  cpf = cpf.replace(/\D/g, "");

  // Check if has 11 digits
  if (cpf.length !== 11) return false;

  // Check if all digits are the same
  if (/^(\d)\1+$/.test(cpf)) return false;

  // Validate first verification digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }

  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  // Validate second verification digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }

  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;

  return true;
};

// Format CPF with mask
export const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

// Format phone number with mask
export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// Owner validation schema
export const ownerFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  document: z.string()
    .min(1, "CPF/CNPJ é obrigatório")
    .refine(
      (val) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val),
      "Formato de CPF inválido. Use: 123.456.789-00"
    ),
  rg: z.string().optional(),
  email: z.string().email("Email inválido"),
  phone: z.string()
    .min(1, "Telefone é obrigatório")
    .refine(
      (val) => /^\(\d{2}\) \d{5}-\d{4}$/.test(val),
      "Formato de telefone inválido. Use: (11) 98765-4321"
    ),
  nationality: z.string().optional(),
  profession: z.string().optional(),
  maritalStatus: z.string().optional(),
  spouseName: z.string().optional(),
  address: addressSchema,
});

// Tenant validation schema
export const tenantFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  document: z.string()
    .min(1, "CPF/CNPJ é obrigatório")
    .refine(
      (val) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val),
      "Formato de CPF inválido. Use: 123.456.789-00"
    ),
  rg: z.string().optional(),
  email: z.string().email("Email inválido"),
  phone: z.string()
    .min(1, "Telefone é obrigatório")
    .refine(
      (val) => /^\(\d{2}\) \d{5}-\d{4}$/.test(val),
      "Formato de telefone inválido. Use: (11) 98765-4321"
    ),
  nationality: z.string().optional(),
  profession: z.string().optional(),
  maritalStatus: z.string().optional(),
  spouseName: z.string().optional(),
  address: addressSchema,
  guarantor: z.object({
    name: z.string().optional(),
    document: z.string()
      .optional()
      .refine(
        (val) => !val || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val),
        "Formato de CPF inválido. Use: 123.456.789-00"
      )
      .refine(
        (val) => !val || validateCPF(val),
        "CPF inválido"
      ),
    rg: z.string().optional(),
    phone: z.string()
      .optional()
      .refine(
        (val) => !val || /^\(\d{2}\) \d{5}-\d{4}$/.test(val),
        "Formato de telefone inválido. Use: (11) 98765-4321"
      ),
    email: z.string()
      .optional()
      .refine(
        (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        "Formato de email inválido"
      ),
    nationality: z.string().optional(),
    profession: z.string().optional(),
    maritalStatus: z.string().optional(),
    spouseName: z.string().optional(),
    address: optionalAddressSchema.optional(),
  }).optional(),
});

// Property validation schema
export const propertyFormSchema = z.object({
  ownerId: z.number().min(1, "Proprietário é obrigatório"),
  name: z.string().optional(), // Nome do imóvel (opcional)
  type: z.enum(["apartamento", "casa", "comercial", "terreno"], {
    invalid_type_error: "Selecione um tipo de imóvel",
    required_error: "Tipo de imóvel é obrigatório",
  }),
  rentValue: z.coerce.number().min(1, "Valor de aluguel é obrigatório"),
  bedrooms: z.coerce.number().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  area: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  availableForRent: z.boolean().default(true),
  address: addressSchema,
  waterCompany: z.string().optional(),
  waterAccountNumber: z.string().optional(),
  electricityCompany: z.string().optional(),
  electricityAccountNumber: z.string().optional(),
});

// Contract validation schema
export const contractFormSchema = z.object({
  ownerId: z.number().min(1, "Proprietário é obrigatório"),
  tenantId: z.number().min(1, "Inquilino é obrigatório"),
  propertyId: z.number().min(1, "Imóvel é obrigatório"),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().min(1, "Data de término é obrigatória"),
  duration: z.coerce.number().min(1, "Duração mínima é de 1 mês"),
  rentValue: z.coerce.number().min(1, "Valor do aluguel é obrigatório"),
  firstPaymentDate: z.string().min(1, "Data do primeiro pagamento é obrigatória"),
  status: z.enum(["ativo", "pendente", "encerrado"], {
    invalid_type_error: "Selecione um status válido",
  }),
  observations: z.string().optional(),
});

// Payment validation schema
export const paymentFormSchema = z.object({
  contractId: z.number().min(1, "Contrato é obrigatório"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  value: z.coerce.number().min(1, "Valor do pagamento é obrigatório"),
  isPaid: z.boolean().default(false),
  paymentDate: z.string().optional(),
  interestAmount: z.coerce.number().optional().default(0),
  latePaymentFee: z.coerce.number().optional().default(0),
  paymentMethod: z.string().optional(),
  receiptNumber: z.string().optional(),
  observations: z.string().optional(),
});
