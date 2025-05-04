import { pgTable, text, serial, integer, boolean, date, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Função para validar CPF
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  // Calcula o primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let mod = sum % 11;
  const dv1 = mod < 2 ? 0 : 11 - mod;
  
  // Verifica o primeiro dígito verificador
  if (parseInt(cleanCPF.charAt(9)) !== dv1) return false;
  
  // Calcula o segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  mod = sum % 11;
  const dv2 = mod < 2 ? 0 : 11 - mod;
  
  // Verifica o segundo dígito verificador
  return parseInt(cleanCPF.charAt(10)) === dv2;
}

// Common schema for address
const addressSchema = z.object({
  zipCode: z.string().min(1, "CEP é obrigatório"),
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
});

// Optional address schema for guarantor
const optionalAddressSchema = z.object({
  zipCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"), // admin, user
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  document: text("document").notNull().unique(), // CPF/CNPJ - Agora com unique constraint
  rg: text("rg"), // RG (documento de identidade)
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  nationality: text("nationality"), // Nacionalidade
  profession: text("profession"), // Profissão
  maritalStatus: text("marital_status"), // Estado civil
  spouseName: text("spouse_name"), // Nome do cônjuge (se casado)
  address: text("address").notNull(), // JSON string of the address
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  document: text("document").notNull().unique(), // CPF/CNPJ - Agora com unique constraint
  rg: text("rg"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  nationality: text("nationality"), // Nacionalidade
  profession: text("profession"), // Profissão
  maritalStatus: text("marital_status"), // Estado civil
  spouseName: text("spouse_name"), // Nome do cônjuge (se casado)
  address: text("address").notNull(), // JSON string of the address
  guarantor: text("guarantor"), // JSON string of the guarantor info
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => owners.id),
  name: text("name"), // Nome do imóvel para identificação mais fácil
  type: text("type").notNull(),
  address: text("address").notNull(), // JSON string of the address
  rentValue: doublePrecision("rent_value").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: integer("area"),
  description: text("description"),
  availableForRent: boolean("available_for_rent").default(true),
  waterCompany: text("water_company"), // Empresa de água
  waterAccountNumber: text("water_account_number"), // Número da conta de água
  electricityCompany: text("electricity_company"), // Empresa de energia elétrica
  electricityAccountNumber: text("electricity_account_number"), // Número da conta de energia
  isActive: boolean("is_active").notNull().default(true), // Indica se o imóvel está ativo no sistema
  createdAt: timestamp("created_at").defaultNow(),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => owners.id),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  duration: integer("duration").notNull(), // in months
  rentValue: integer("rent_value").notNull(), // in cents
  firstPaymentDate: date("first_payment_date").notNull(), // data completa do primeiro pagamento
  status: text("status").notNull(), // ativo, pendente, encerrado
  observations: text("observations"),
  isRenewal: boolean("is_renewal").default(false), // indica se é um contrato renovado
  originalContractId: integer("original_contract_id").references(() => contracts.id), // referência ao contrato original em caso de renovação
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabela de termos aditivos de renovação
export const contractRenewals = pgTable("contract_renewals", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  originalContractId: integer("original_contract_id").notNull().references(() => contracts.id),
  renewalDate: date("renewal_date").notNull(), // Data da renovação
  startDate: date("start_date").notNull(), // Nova data de início
  endDate: date("end_date").notNull(), // Nova data de fim
  newRentValue: doublePrecision("new_rent_value").notNull(), // Novo valor do aluguel
  adjustmentIndex: text("adjustment_index").notNull().default("IGP-M"), // Índice usado para reajuste
  observations: text("observations"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  dueDate: date("due_date").notNull(),
  value: integer("value").notNull(), // in cents
  isPaid: boolean("is_paid").default(false),
  paymentDate: date("payment_date"),
  interestAmount: integer("interest_amount").default(0), // juros em centavos
  latePaymentFee: integer("late_payment_fee").default(0), // multa em centavos
  paymentMethod: text("payment_method"), // método de pagamento (PIX, dinheiro, etc)
  receiptNumber: text("receipt_number"), // número do recibo
  observations: text("observations"),
  isRestored: boolean("is_restored").default(false), // indica se o pagamento foi restaurado
  installmentNumber: integer("installment_number").default(0), // número da parcela (1, 2, 3, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabela para registrar pagamentos excluídos
export const deletedPayments = pgTable("deleted_payments", {
  id: serial("id").primaryKey(),
  originalId: integer("original_id"), // ID original do pagamento excluído
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  dueDate: date("due_date").notNull(),
  value: integer("value").notNull(), // in cents
  isPaid: boolean("is_paid").default(false),
  paymentDate: date("payment_date"),
  interestAmount: integer("interest_amount").default(0),
  latePaymentFee: integer("late_payment_fee").default(0),
  paymentMethod: text("payment_method"),
  receiptNumber: text("receipt_number"),
  observations: text("observations"),
  deletedBy: integer("deleted_by").references(() => users.id), // Usuário que excluiu
  deletedAt: timestamp("deleted_at").defaultNow(), // Data/hora da exclusão
  originalCreatedAt: timestamp("original_created_at"), // Data de criação do pagamento original
  wasRestored: boolean("was_restored").default(false), // Indica se o pagamento estava marcado como restaurado
  installmentNumber: integer("installment_number").default(0) // número da parcela (1, 2, 3, etc.)
});

// Tabela para documentos do inquilino (identidade, comprovante de endereço, holerites, etc.)
export const tenantDocuments = pgTable("tenant_documents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  fileName: text("file_name").notNull(), // Nome original do arquivo
  storedFileName: text("stored_file_name").notNull(), // Nome do arquivo no sistema
  fileSize: integer("file_size").notNull(), // Tamanho do arquivo em bytes
  fileType: text("file_type").notNull(), // Tipo do arquivo (ex: image/jpeg, application/pdf)
  documentType: text("document_type").notNull(), // Tipo de documento (ex: identidade, comprovante_endereco, holerite)
  uploadedBy: integer("uploaded_by").references(() => users.id), // Usuário que fez o upload
  uploadedAt: timestamp("uploaded_at").defaultNow(), // Data do upload
  description: text("description"), // Descrição opcional do documento
  isActive: boolean("is_active").default(true), // Indica se o documento está ativo
});

// Tabela para modelos de contrato personalizáveis
export const contractTemplates = pgTable("contract_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Nome do modelo (ex: "Contrato Residencial Padrão")
  type: text("type").notNull().default("residential"), // Tipo do modelo: "residential" ou "commercial"
  content: text("content").notNull(), // Conteúdo HTML do modelo com tags para substituição
  isActive: boolean("is_active").default(true), // Indica se o modelo está ativo
  createdAt: timestamp("created_at").defaultNow(), // Data de criação
  updatedAt: timestamp("updated_at").defaultNow(), // Data da última atualização
});

// Relations
export const ownersRelations = relations(owners, ({ many }) => ({
  properties: many(properties),
  contracts: many(contracts),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  contracts: many(contracts),
  documents: many(tenantDocuments),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(owners, {
    fields: [properties.ownerId],
    references: [owners.id],
  }),
  contracts: many(contracts),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  owner: one(owners, {
    fields: [contracts.ownerId],
    references: [owners.id],
  }),
  tenant: one(tenants, {
    fields: [contracts.tenantId],
    references: [tenants.id],
  }),
  property: one(properties, {
    fields: [contracts.propertyId],
    references: [properties.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  contract: one(contracts, {
    fields: [payments.contractId],
    references: [contracts.id],
  }),
}));

export const contractRenewalsRelations = relations(contractRenewals, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractRenewals.contractId],
    references: [contracts.id],
  }),
  originalContract: one(contracts, {
    fields: [contractRenewals.originalContractId],
    references: [contracts.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
});

export const insertOwnerSchema = createInsertSchema(owners).extend({
  address: addressSchema,
});

// Schema para o fiador com endereço e informações adicionais
const guarantorSchema = z.object({
  name: z.string().optional(),
  document: z.string().optional(),
  rg: z.string().optional(), // RG (documento de identidade)
  phone: z.string().optional(),
  email: z.string().optional(),
  nationality: z.string().optional(), // Nacionalidade
  profession: z.string().optional(), // Profissão
  maritalStatus: z.string().optional(), // Estado civil
  spouseName: z.string().optional(), // Nome do cônjuge (se casado)
  address: addressSchema.optional(),
});

export const insertTenantSchema = createInsertSchema(tenants).extend({
  address: addressSchema,
  guarantor: guarantorSchema.optional(),
});

export const insertPropertySchema = createInsertSchema(properties).extend({
  address: addressSchema,
  waterCompany: z.string().optional(),
  waterAccountNumber: z.string().optional(),
  electricityCompany: z.string().optional(),
  electricityAccountNumber: z.string().optional(),
});

export const insertContractSchema = createInsertSchema(contracts);

export const insertPaymentSchema = createInsertSchema(payments);
export const insertDeletedPaymentSchema = createInsertSchema(deletedPayments);
export const insertContractRenewalSchema = createInsertSchema(contractRenewals);
export const insertTenantDocumentSchema = createInsertSchema(tenantDocuments).omit({
  id: true,
  uploadedAt: true,
  isActive: true,
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDeletedPayment = z.infer<typeof insertDeletedPaymentSchema>;
export type DeletedPayment = typeof deletedPayments.$inferSelect;

export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type Owner = typeof owners.$inferSelect & { 
  address: z.infer<typeof addressSchema> 
};

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect & { 
  address: z.infer<typeof addressSchema> 
};

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect & { 
  address: z.infer<typeof addressSchema> 
};

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertContractRenewal = z.infer<typeof insertContractRenewalSchema>;
export type ContractRenewal = typeof contractRenewals.$inferSelect;

export type InsertTenantDocument = z.infer<typeof insertTenantDocumentSchema>;
export type TenantDocument = typeof tenantDocuments.$inferSelect;

export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;
export type ContractTemplate = typeof contractTemplates.$inferSelect;

// Validation schemas with more specific rules
export const userValidationSchema = insertUserSchema.extend({
  username: z.string().min(4, "Nome de usuário deve ter pelo menos 4 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "user"], {
    errorMap: () => ({ message: "Selecione um papel válido (admin/user)" }),
  }),
});

export const ownerValidationSchema = insertOwnerSchema.extend({
  document: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido. Formato: 123.456.789-00"),
  phone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido. Formato: (11) 98765-4321"),
  email: z.string().email("Email inválido"),
});

export const tenantValidationSchema = insertTenantSchema.extend({
  document: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido. Formato: 123.456.789-00")
    .refine((cpf) => validateCPF(cpf), {
      message: "CPF inválido. Verifique os dígitos de verificação."
    }),
  phone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido. Formato: (11) 98765-4321"),
  email: z.string().email("Email inválido"),
  guarantor: z.object({
    name: z.string().optional(),
    document: z.string()
      .optional()
      .refine(
        (cpf) => !cpf || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf), 
        { message: "CPF do fiador inválido. Formato: 123.456.789-00" }
      )
      .refine(
        (cpf) => !cpf || validateCPF(cpf), 
        { message: "CPF do fiador inválido. Verifique os dígitos de verificação." }
      ),
    rg: z.string().optional(), // RG do fiador
    phone: z.string().optional(),
    email: z.string()
      .optional()
      .refine(
        (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        { message: "Email do fiador inválido" }
      ),
    nationality: z.string().optional(), // Nacionalidade do fiador
    profession: z.string().optional(), // Profissão do fiador
    maritalStatus: z.string().optional(), // Estado civil do fiador
    spouseName: z.string().optional(), // Nome do cônjuge do fiador (se casado)
    address: z.object({
      zipCode: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
    }).optional(),
  }).optional(),
});

export const propertyValidationSchema = insertPropertySchema.extend({
  type: z.enum(["apartamento", "casa", "comercial", "terreno"], {
    errorMap: () => ({ message: "Selecione um tipo de imóvel válido" }),
  }),
  rentValue: z.number().min(1, "Valor do aluguel é obrigatório"),
});

export const contractValidationSchema = insertContractSchema.extend({
  ownerId: z.number().min(1, "Selecione um proprietário"),
  tenantId: z.number().min(1, "Selecione um inquilino"),
  propertyId: z.number().min(1, "Selecione um imóvel"),
  duration: z.number().min(1, "Duração mínima de 1 mês"),
  firstPaymentDate: z.string().min(1, "Data do primeiro pagamento é obrigatória"),
});

export const contractRenewalValidationSchema = insertContractRenewalSchema.extend({
  contractId: z.number().min(1, "Contrato novo é obrigatório"),
  originalContractId: z.number().min(1, "Contrato original é obrigatório"),
  renewalDate: z.coerce.date().refine(date => date instanceof Date, {
    message: "Data de renovação é obrigatória"
  }),
  startDate: z.coerce.date().refine(date => date instanceof Date, {
    message: "Data de início é obrigatória"
  }),
  endDate: z.coerce.date().refine(date => date instanceof Date, {
    message: "Data de término é obrigatória"
  }),
  newRentValue: z.number().min(1, "Valor do aluguel é obrigatório"),
  adjustmentIndex: z.string().min(1, "Índice de reajuste é obrigatório"),
});

export const contractTemplateValidationSchema = insertContractTemplateSchema.extend({
  name: z.string().min(3, "Nome do modelo deve ter pelo menos 3 caracteres"),
  content: z.string().min(10, "O conteúdo do modelo é obrigatório").max(10000000, "O conteúdo excede o tamanho máximo permitido"),
});
