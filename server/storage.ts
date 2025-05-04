import { 
  users, owners, tenants, properties, contracts, payments, deletedPayments, contractRenewals, contractTemplates, tenantDocuments,
  type User, type InsertUser,
  type Owner, type InsertOwner,
  type Tenant, type InsertTenant,
  type Property, type InsertProperty,
  type Contract, type InsertContract,
  type Payment, type InsertPayment,
  type DeletedPayment, type InsertDeletedPayment,
  type ContractRenewal, type InsertContractRenewal,
  type ContractTemplate, type InsertContractTemplate,
  type TenantDocument
} from "@shared/schema";

import { db } from "./db";
import { eq, and, lt, lte, gte, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  updateLastLogin(id: number): Promise<User | undefined>;
  
  // Admin operations
  resetSystem(adminUserId: number): Promise<void>;
  backupData(): Promise<any>;
  restoreData(backupData: any, adminUserId: number): Promise<void>;

  // Owners
  getOwners(): Promise<Owner[]>;
  getOwner(id: number): Promise<Owner | undefined>;
  findOwnerByDocument(document: string): Promise<Owner | undefined>;
  getOwnerByContractId(contractId: number): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined>;
  deleteOwner(id: number): Promise<boolean>;

  // Tenants
  getTenants(): Promise<Tenant[]>;
  getTenant(id: number): Promise<Tenant | undefined>;
  findTenantByDocument(document: string): Promise<Tenant | undefined>;
  getTenantByContractId(contractId: number): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: number): Promise<boolean>;

  // Properties
  getProperties(showInactive?: boolean): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  getPropertiesByOwner(ownerId: number): Promise<Property[]>;
  getPropertyByContractId(contractId: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<boolean>;

  // Contracts
  getContracts(): Promise<Contract[]>;
  getContract(id: number): Promise<Contract | undefined>;
  getContractsByOwner(ownerId: number): Promise<Contract[]>;
  getContractsByTenant(tenantId: number): Promise<Contract[]>;
  getContractsByProperty(propertyId: number): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: number): Promise<{ success: boolean; hasPaidPayments: boolean; paidPaymentIds?: number[] }>;
  
  // Contract Renewals
  getContractRenewals(): Promise<ContractRenewal[]>;
  getContractRenewal(id: number): Promise<ContractRenewal | undefined>;
  getContractRenewalsByContract(contractId: number): Promise<ContractRenewal[]>;
  getContractRenewalsByOriginalContract(originalContractId: number): Promise<ContractRenewal[]>;
  getContractRenewalByNewContract(newContractId: number): Promise<ContractRenewal | undefined>;
  createContractRenewal(renewal: InsertContractRenewal): Promise<ContractRenewal>;
  updateContractRenewal(id: number, renewal: Partial<InsertContractRenewal>): Promise<ContractRenewal | undefined>;
  deleteContractRenewal(id: number): Promise<boolean>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByContract(contractId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number, userId: number): Promise<boolean>;
  
  // Deleted Payments
  getDeletedPayments(): Promise<DeletedPayment[]>;
  getDeletedPaymentsByContract(contractId: number): Promise<DeletedPayment[]>;
  getDeletedPaymentsByUser(userId: number): Promise<DeletedPayment[]>;
  restoreDeletedPayment(id: number): Promise<Payment | undefined>;

  // Dashboard statistics
  getDashboardStats(): Promise<{
    expiredContracts: number;
    expiringContracts: number;
    totalContracts: number;
    pendingPayments: number;
    overduePayments: number;
  }>;
  
  // Contract Templates
  getContractTemplates(): Promise<ContractTemplate[]>;
  getContractTemplate(id: number): Promise<ContractTemplate | undefined>;
  createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate>;
  updateContractTemplate(id: number, template: Partial<InsertContractTemplate>): Promise<ContractTemplate | undefined>;
  deleteContractTemplate(id: number): Promise<boolean>;
  
  // Obter renovação de contrato pelo ID do novo contrato
  getContractRenewalByNewContract(newContractId: number): Promise<ContractRenewal | undefined>;
}

export class MemStorage implements IStorage {
  // Implementações para findOwnerByDocument e findTenantByDocument
  async findOwnerByDocument(document: string): Promise<Owner | undefined> {
    const owner = Array.from(this.owners.values()).find(
      (owner) => owner.document === document,
    );
    if (!owner) return undefined;
    
    return {
      ...owner,
      address: typeof owner.address === 'string' 
        ? JSON.parse(owner.address) 
        : owner.address
    };
  }
  
  async findTenantByDocument(document: string): Promise<Tenant | undefined> {
    const tenant = Array.from(this.tenants.values()).find(
      (tenant) => tenant.document === document,
    );
    if (!tenant) return undefined;
    
    return {
      ...tenant,
      address: typeof tenant.address === 'string' 
        ? JSON.parse(tenant.address) 
        : tenant.address,
      guarantor: tenant.guarantor && typeof tenant.guarantor === 'string'
        ? JSON.parse(tenant.guarantor)
        : tenant.guarantor
    };
  }
  
  // Métodos para obter informações por ID de contrato
  async getOwnerByContractId(contractId: number): Promise<Owner | undefined> {
    const contract = this.contracts.get(contractId);
    if (!contract) return undefined;
    return this.getOwner(contract.ownerId);
  }
  
  async getTenantByContractId(contractId: number): Promise<Tenant | undefined> {
    const contract = this.contracts.get(contractId);
    if (!contract) return undefined;
    return this.getTenant(contract.tenantId);
  }
  
  async getPropertyByContractId(contractId: number): Promise<Property | undefined> {
    const contract = this.contracts.get(contractId);
    if (!contract) return undefined;
    return this.getProperty(contract.propertyId);
  }
  private users: Map<number, User>;
  private owners: Map<number, Owner>;
  private tenants: Map<number, Tenant>;
  private properties: Map<number, Property>;
  private contracts: Map<number, Contract>;
  private payments: Map<number, Payment>;
  private deletedPayments: Map<number, DeletedPayment>;
  private contractTemplates: Map<number, ContractTemplate>;
  
  private userId: number = 1;
  private ownerId: number = 1;
  private tenantId: number = 1;
  private propertyId: number = 1;
  private contractId: number = 1;
  private paymentId: number = 1;
  private deletedPaymentId: number = 1;
  private contractTemplateId: number = 1;

  constructor() {
    this.users = new Map();
    this.owners = new Map();
    this.tenants = new Map();
    this.properties = new Map();
    this.contracts = new Map();
    this.payments = new Map();
    this.deletedPayments = new Map();
    this.contractRenewals = new Map();
    this.contractTemplates = new Map();
  }

  // USER METHODS
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id,
      isActive: true,
      createdAt: new Date(),
      lastLogin: null
    };
    this.users.set(id, user);
    return user;
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async updateUser(id: number, partialUser: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...partialUser };
    this.users.set(id, updatedUser);
    
    return updatedUser;
  }
  
  async updateLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, lastLogin: new Date() };
    this.users.set(id, updatedUser);
    
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  // Admin operations
  async resetSystem(adminUserId: number): Promise<void> {
    const adminUser = this.users.get(adminUserId);
    if (!adminUser) {
      throw new Error("Usuário administrador não encontrado");
    }
    
    // Limpar todos os dados, exceto o usuário administrador
    this.owners.clear();
    this.tenants.clear();
    this.properties.clear();
    this.contracts.clear();
    this.contractRenewals.clear();
    this.payments.clear();
    this.deletedPayments.clear();
    
    // Limpar todos os usuários exceto o administrador
    const allUsers = Array.from(this.users.entries());
    this.users.clear();
    this.users.set(adminUserId, adminUser);
    
    // Resetar contadores
    this.ownerId = 1;
    this.tenantId = 1;
    this.propertyId = 1;
    this.contractId = 1;
    this.contractRenewalId = 1;
    this.paymentId = 1;
    this.deletedPaymentId = 1;
    
    // Manter o contador de usuários maior que o ID máximo existente
    this.userId = adminUserId + 1;
  }
  
  async backupData(): Promise<any> {
    // Criar um objeto que contém todos os dados do sistema
    const backup = {
      users: Array.from(this.users.values()),
      owners: Array.from(this.owners.values()),
      tenants: Array.from(this.tenants.values()),
      properties: Array.from(this.properties.values()),
      contracts: Array.from(this.contracts.values()),
      contractRenewals: Array.from(this.contractRenewals.values()),
      payments: Array.from(this.payments.values()),
      deletedPayments: Array.from(this.deletedPayments.values()),
      // Incluir os contadores para garantir que novos IDs sejam corretamente atribuídos
      counters: {
        userId: this.userId,
        ownerId: this.ownerId,
        tenantId: this.tenantId,
        propertyId: this.propertyId,
        contractId: this.contractId,
        contractRenewalId: this.contractRenewalId,
        paymentId: this.paymentId,
        deletedPaymentId: this.deletedPaymentId
      },
      // Incluir metadados do backup
      metadata: {
        version: "1.0",
        timestamp: new Date().toISOString(),
        description: "Backup completo do sistema"
      }
    };
    
    return backup;
  }
  
  async restoreData(backupData: any, adminUserId: number): Promise<void> {
    // Verificar se o administrador existe
    const adminUser = this.users.get(adminUserId);
    if (!adminUser) {
      throw new Error("Usuário administrador não encontrado");
    }
    
    // Primeiro limpar todos os dados existentes, como um reset
    this.owners.clear();
    this.tenants.clear();
    this.properties.clear();
    this.contracts.clear();
    this.contractRenewals.clear();
    this.payments.clear();
    this.deletedPayments.clear();
    
    // Limpar todos os usuários exceto o administrador
    this.users.clear();
    this.users.set(adminUserId, adminUser);
    
    // Restaurar os dados do backup
    if (backupData.users) {
      backupData.users.forEach((user: User) => {
        // Não sobrescrever o usuário admin atual
        if (user.id !== adminUserId) {
          this.users.set(user.id, user);
        }
      });
    }
    
    if (backupData.owners) {
      backupData.owners.forEach((owner: Owner) => {
        this.owners.set(owner.id, owner);
      });
    }
    
    if (backupData.tenants) {
      backupData.tenants.forEach((tenant: Tenant) => {
        this.tenants.set(tenant.id, tenant);
      });
    }
    
    if (backupData.properties) {
      backupData.properties.forEach((property: Property) => {
        this.properties.set(property.id, property);
      });
    }
    
    if (backupData.contracts) {
      backupData.contracts.forEach((contract: Contract) => {
        this.contracts.set(contract.id, contract);
      });
    }
    
    if (backupData.contractRenewals) {
      backupData.contractRenewals.forEach((renewal: ContractRenewal) => {
        this.contractRenewals.set(renewal.id, renewal);
      });
    }
    
    if (backupData.payments) {
      backupData.payments.forEach((payment: Payment) => {
        this.payments.set(payment.id, payment);
      });
    }
    
    if (backupData.deletedPayments) {
      backupData.deletedPayments.forEach((deletedPayment: DeletedPayment) => {
        this.deletedPayments.set(deletedPayment.id, deletedPayment);
      });
    }
    
    // Restaurar os contadores para garantir que novos IDs sejam únicos
    if (backupData.counters) {
      this.userId = backupData.counters.userId || this.userId;
      this.ownerId = backupData.counters.ownerId || this.ownerId;
      this.tenantId = backupData.counters.tenantId || this.tenantId;
      this.propertyId = backupData.counters.propertyId || this.propertyId;
      this.contractId = backupData.counters.contractId || this.contractId;
      this.contractRenewalId = backupData.counters.contractRenewalId || this.contractRenewalId;
      this.paymentId = backupData.counters.paymentId || this.paymentId;
      this.deletedPaymentId = backupData.counters.deletedPaymentId || this.deletedPaymentId;
    }
  }

  // OWNER METHODS
  async getOwners(showInactive: boolean = false): Promise<Owner[]> {
    const owners = Array.from(this.owners.values());
    if (!showInactive) {
      return owners.filter(owner => owner.isActive !== false);
    }
    return owners;
  }

  async getOwner(id: number): Promise<Owner | undefined> {
    return this.owners.get(id);
  }

  async createOwner(insertOwner: InsertOwner): Promise<Owner> {
    const id = this.ownerId++;
    const owner: Owner = {
      ...insertOwner,
      id,
      address: typeof insertOwner.address === 'string' 
        ? JSON.parse(insertOwner.address) 
        : insertOwner.address,
      createdAt: new Date()
    };
    // Convert address to string for storage
    this.owners.set(id, {
      ...owner,
      address: typeof owner.address === 'object'
        ? JSON.stringify(owner.address)
        : owner.address
    } as any);
    return owner;
  }

  async updateOwner(id: number, partialOwner: Partial<InsertOwner>): Promise<Owner | undefined> {
    const owner = this.owners.get(id);
    if (!owner) return undefined;

    const updatedOwner = {
      ...owner,
      ...partialOwner,
      address: partialOwner.address 
        ? (typeof partialOwner.address === 'string' 
          ? partialOwner.address 
          : JSON.stringify(partialOwner.address))
        : owner.address
    };

    this.owners.set(id, updatedOwner as any);
    
    return {
      ...updatedOwner,
      address: typeof updatedOwner.address === 'string' 
        ? JSON.parse(updatedOwner.address) 
        : updatedOwner.address
    };
  }

  async deleteOwner(id: number): Promise<boolean> {
    return this.owners.delete(id);
  }

  // TENANT METHODS
  async getTenants(showInactive: boolean = false): Promise<Tenant[]> {
    const tenants = Array.from(this.tenants.values());
    
    // Filtra inquilinos ativos se showInactive for false
    const filteredTenants = !showInactive 
      ? tenants.filter(tenant => tenant.isActive !== false)
      : tenants;
    
    // Retorna os inquilinos com os dados processados
    return filteredTenants.map(tenant => ({
      ...tenant,
      address: typeof tenant.address === 'string' 
        ? JSON.parse(tenant.address) 
        : tenant.address,
      guarantor: tenant.guarantor && typeof tenant.guarantor === 'string'
        ? JSON.parse(tenant.guarantor)
        : tenant.guarantor
    }));
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;
    
    return {
      ...tenant,
      address: typeof tenant.address === 'string' 
        ? JSON.parse(tenant.address) 
        : tenant.address,
      guarantor: tenant.guarantor && typeof tenant.guarantor === 'string'
        ? JSON.parse(tenant.guarantor)
        : tenant.guarantor
    };
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const id = this.tenantId++;
    const tenant: Tenant = {
      ...insertTenant,
      id,
      address: typeof insertTenant.address === 'string' 
        ? JSON.parse(insertTenant.address) 
        : insertTenant.address,
      guarantor: insertTenant.guarantor 
        ? (typeof insertTenant.guarantor === 'string' 
          ? insertTenant.guarantor 
          : JSON.stringify(insertTenant.guarantor))
        : undefined,
      createdAt: new Date()
    };
    
    // Store with stringified objects
    this.tenants.set(id, {
      ...tenant,
      address: typeof tenant.address === 'object'
        ? JSON.stringify(tenant.address)
        : tenant.address,
      guarantor: tenant.guarantor && typeof tenant.guarantor === 'object'
        ? JSON.stringify(tenant.guarantor)
        : tenant.guarantor
    } as any);
    
    return tenant;
  }

  async updateTenant(id: number, partialTenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;

    const updatedTenant = {
      ...tenant,
      ...partialTenant,
      address: partialTenant.address 
        ? (typeof partialTenant.address === 'string' 
          ? partialTenant.address 
          : JSON.stringify(partialTenant.address))
        : tenant.address,
      guarantor: partialTenant.guarantor 
        ? (typeof partialTenant.guarantor === 'string' 
          ? partialTenant.guarantor 
          : JSON.stringify(partialTenant.guarantor))
        : tenant.guarantor
    };

    this.tenants.set(id, updatedTenant as any);
    
    return {
      ...updatedTenant,
      address: typeof updatedTenant.address === 'string' 
        ? JSON.parse(updatedTenant.address) 
        : updatedTenant.address,
      guarantor: updatedTenant.guarantor && typeof updatedTenant.guarantor === 'string'
        ? JSON.parse(updatedTenant.guarantor)
        : updatedTenant.guarantor
    };
  }

  async deleteTenant(id: number): Promise<boolean> {
    return this.tenants.delete(id);
  }

  // PROPERTY METHODS
  async getProperties(showInactive: boolean = false): Promise<Property[]> {
    return Array.from(this.properties.values())
      .filter(property => showInactive || property.isActive !== false) // Mostrar apenas ativos, a menos que showInactive seja true
      .map(property => ({
        ...property,
        address: typeof property.address === 'string' 
          ? JSON.parse(property.address) 
          : property.address
      }));
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;
    
    return {
      ...property,
      address: typeof property.address === 'string' 
        ? JSON.parse(property.address) 
        : property.address
    };
  }

  async getPropertiesByOwner(ownerId: number): Promise<Property[]> {
    return Array.from(this.properties.values())
      .filter(property => property.ownerId === ownerId)
      .map(property => ({
        ...property,
        address: typeof property.address === 'string' 
          ? JSON.parse(property.address) 
          : property.address
      }));
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = this.propertyId++;
    const property: Property = {
      ...insertProperty,
      id,
      address: typeof insertProperty.address === 'string' 
        ? JSON.parse(insertProperty.address) 
        : insertProperty.address,
      createdAt: new Date()
    };
    
    // Store with stringified address
    this.properties.set(id, {
      ...property,
      address: typeof property.address === 'object'
        ? JSON.stringify(property.address)
        : property.address
    } as any);
    
    return property;
  }

  async updateProperty(id: number, partialProperty: Partial<InsertProperty>): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;

    const updatedProperty = {
      ...property,
      ...partialProperty,
      address: partialProperty.address 
        ? (typeof partialProperty.address === 'string' 
          ? partialProperty.address 
          : JSON.stringify(partialProperty.address))
        : property.address
    };

    this.properties.set(id, updatedProperty as any);
    
    return {
      ...updatedProperty,
      address: typeof updatedProperty.address === 'string' 
        ? JSON.parse(updatedProperty.address) 
        : updatedProperty.address
    };
  }

  async deleteProperty(id: number): Promise<boolean> {
    return this.properties.delete(id);
  }

  // CONTRACT METHODS
  async getContracts(): Promise<Contract[]> {
    return Array.from(this.contracts.values());
  }

  async getContract(id: number): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }

  async getContractsByOwner(ownerId: number): Promise<Contract[]> {
    return Array.from(this.contracts.values())
      .filter(contract => contract.ownerId === ownerId);
  }

  async getContractsByTenant(tenantId: number): Promise<Contract[]> {
    return Array.from(this.contracts.values())
      .filter(contract => contract.tenantId === tenantId);
  }

  async getContractsByProperty(propertyId: number): Promise<Contract[]> {
    return Array.from(this.contracts.values())
      .filter(contract => contract.propertyId === propertyId);
  }

  async createContract(insertContract: InsertContract): Promise<Contract> {
    const id = this.contractId++;
    const contract: Contract = {
      ...insertContract,
      id,
      createdAt: new Date()
    };
    this.contracts.set(id, contract);
    return contract;
  }

  async updateContract(id: number, partialContract: Partial<InsertContract>): Promise<Contract | undefined> {
    const contract = this.contracts.get(id);
    if (!contract) return undefined;

    const updatedContract = {
      ...contract,
      ...partialContract,
    };

    this.contracts.set(id, updatedContract);
    return updatedContract;
  }

  async deleteContract(id: number): Promise<{ success: boolean; hasPaidPayments: boolean; paidPaymentIds?: number[] }> {
    try {
      // Verificar se existem parcelas pagas para este contrato
      const contractPayments = Array.from(this.payments.values()).filter(
        (payment) => payment.contractId === id
      );
      
      const paidPayments = contractPayments.filter(payment => payment.isPaid);
      
      if (paidPayments.length > 0) {
        // Se existem parcelas pagas, retornar erro
        return { 
          success: false, 
          hasPaidPayments: true, 
          paidPaymentIds: paidPayments.map(payment => payment.id) 
        };
      }
      
      // Excluir todas as parcelas relacionadas ao contrato
      for (const payment of contractPayments) {
        this.payments.delete(payment.id);
      }
      
      // Excluir o contrato
      const success = this.contracts.delete(id);
      
      return { success, hasPaidPayments: false };
    } catch (error) {
      console.error("Error deleting contract:", error);
      return { success: false, hasPaidPayments: false };
    }
  }

  // CONTRACT RENEWAL METHODS
  private contractRenewals: Map<number, ContractRenewal> = new Map();
  private contractRenewalId: number = 1;

  async getContractRenewals(): Promise<ContractRenewal[]> {
    return Array.from(this.contractRenewals.values());
  }

  async getContractRenewal(id: number): Promise<ContractRenewal | undefined> {
    return this.contractRenewals.get(id);
  }

  async getContractRenewalsByContract(contractId: number): Promise<ContractRenewal[]> {
    return Array.from(this.contractRenewals.values())
      .filter(renewal => renewal.contractId === contractId);
  }

  async getContractRenewalsByOriginalContract(originalContractId: number): Promise<ContractRenewal[]> {
    return Array.from(this.contractRenewals.values())
      .filter(renewal => renewal.originalContractId === originalContractId);
  }

  async createContractRenewal(insertRenewal: InsertContractRenewal): Promise<ContractRenewal> {
    const id = this.contractRenewalId++;
    const renewal: ContractRenewal = {
      ...insertRenewal,
      id,
      createdAt: new Date()
    };
    this.contractRenewals.set(id, renewal);
    return renewal;
  }

  async updateContractRenewal(id: number, partialRenewal: Partial<InsertContractRenewal>): Promise<ContractRenewal | undefined> {
    const renewal = this.contractRenewals.get(id);
    if (!renewal) return undefined;

    const updatedRenewal = {
      ...renewal,
      ...partialRenewal,
    };

    this.contractRenewals.set(id, updatedRenewal);
    return updatedRenewal;
  }

  async deleteContractRenewal(id: number): Promise<boolean> {
    return this.contractRenewals.delete(id);
  }

  // PAYMENT METHODS
  async getPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByContract(contractId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.contractId === contractId);
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.paymentId++;
    const payment: Payment = {
      ...insertPayment,
      id,
      createdAt: new Date()
    };
    this.payments.set(id, payment);
    return payment;
  }

  async updatePayment(id: number, partialPayment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;

    const updatedPayment = {
      ...payment,
      ...partialPayment,
    };

    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  async deletePayment(id: number, userId: number): Promise<boolean> {
    const payment = this.payments.get(id);
    if (!payment) {
      return false;
    }
    
    const deletedId = this.deletedPaymentId++;
    const deletedPayment: DeletedPayment = {
      id: deletedId,
      originalId: payment.id,
      contractId: payment.contractId,
      dueDate: payment.dueDate,
      value: payment.value,
      isPaid: payment.isPaid || false,
      paymentDate: payment.paymentDate,
      interestAmount: payment.interestAmount || 0,
      latePaymentFee: payment.latePaymentFee || 0,
      paymentMethod: payment.paymentMethod,
      receiptNumber: payment.receiptNumber,
      observations: payment.observations,
      deletedBy: userId,
      installmentNumber: payment.installmentNumber || 0, // Salvar o número da parcela
      originalCreatedAt: payment.createdAt,
      deletedAt: new Date(),
      wasRestored: payment.isRestored || false, // Registra se o pagamento era um restaurado
      createdAt: new Date()
    };
    
    this.deletedPayments.set(deletedId, deletedPayment);
    return this.payments.delete(id);
  }
  
  // DELETED PAYMENTS METHODS
  async getDeletedPayments(): Promise<DeletedPayment[]> {
    return Array.from(this.deletedPayments.values())
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }
  
  async getDeletedPaymentsByContract(contractId: number): Promise<DeletedPayment[]> {
    return Array.from(this.deletedPayments.values())
      .filter(payment => payment.contractId === contractId)
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }
  
  async getDeletedPaymentsByUser(userId: number): Promise<DeletedPayment[]> {
    return Array.from(this.deletedPayments.values())
      .filter(payment => payment.deletedBy === userId)
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }
  
  async restoreDeletedPayment(id: number): Promise<Payment | undefined> {
    // Buscar o pagamento excluído pelo ID
    const deletedPayment = this.deletedPayments.get(id);
    if (!deletedPayment) return undefined;
    
    // Criar um novo pagamento com os dados originais
    const newPayment: Payment = {
      id: this.paymentId++,
      contractId: deletedPayment.contractId,
      value: deletedPayment.value,
      dueDate: deletedPayment.dueDate,
      isPaid: null,  // Reiniciar o status de pagamento
      paymentDate: null,
      interestAmount: null,
      latePaymentFee: null,
      paymentMethod: null,
      receiptNumber: null,
      observations: deletedPayment.observations,
      isRestored: true, // Marcar como restaurado
      installmentNumber: deletedPayment.installmentNumber || 0, // Manter número da parcela
      createdAt: deletedPayment.originalCreatedAt || new Date()
    };
    
    // Adicionar o novo pagamento ao sistema
    this.payments.set(newPayment.id, newPayment);
    
    // Remover o pagamento excluído
    this.deletedPayments.delete(id);
    
    return newPayment;
  }

  // DASHBOARD STATISTICS
  async getDashboardStats(): Promise<{
    expiredContracts: number;
    expiringContracts: number;
    totalContracts: number;
    pendingPayments: number;
    overduePayments: number;
  }> {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const contracts = Array.from(this.contracts.values());
    const payments = Array.from(this.payments.values());

    const expiredContracts = contracts.filter(contract => {
      const endDate = new Date(contract.endDate);
      return endDate < today && contract.status !== 'encerrado';
    }).length;

    const expiringContracts = contracts.filter(contract => {
      const endDate = new Date(contract.endDate);
      return endDate >= today && endDate <= thirtyDaysFromNow && contract.status !== 'encerrado';
    }).length;

    const totalContracts = contracts.filter(contract => 
      contract.status === 'ativo'
    ).length;

    const pendingPayments = payments.filter(payment => 
      !payment.isPaid && new Date(payment.dueDate) > today
    ).length;
    
    const overduePayments = payments.filter(payment => 
      !payment.isPaid && new Date(payment.dueDate) <= today
    ).length;

    return {
      expiredContracts,
      expiringContracts,
      totalContracts,
      pendingPayments,
      overduePayments
    };
  }

  // CONTRACT TEMPLATE METHODS
  async getContractTemplates(): Promise<ContractTemplate[]> {
    return Array.from(this.contractTemplates.values())
      .filter(template => template.isActive !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getContractTemplate(id: number): Promise<ContractTemplate | undefined> {
    return this.contractTemplates.get(id);
  }

  async createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate> {
    const id = this.contractTemplateId++;
    const newTemplate: ContractTemplate = {
      ...template,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    this.contractTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateContractTemplate(id: number, template: Partial<InsertContractTemplate>): Promise<ContractTemplate | undefined> {
    const existingTemplate = this.contractTemplates.get(id);
    if (!existingTemplate) return undefined;

    const updatedTemplate = {
      ...existingTemplate,
      ...template,
      updatedAt: new Date()
    };

    this.contractTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteContractTemplate(id: number): Promise<boolean> {
    const template = this.contractTemplates.get(id);
    if (!template) return false;

    // Soft delete - apenas marca como inativo
    template.isActive = false;
    this.contractTemplates.set(id, template);
    return true;
  }

  // Implementação do método getContractRenewalByNewContract
  async getContractRenewalByNewContract(newContractId: number): Promise<ContractRenewal | undefined> {
    return Array.from(this.contractRenewals.values()).find(
      renewal => renewal.contractId === newContractId
    );
  }
}

export class DatabaseStorage implements IStorage {
  // Backup e restauração do sistema
  async backupData(): Promise<any> {
    try {
      // Obter todos os dados do banco de dados
      const usersData = await db.select().from(users);
      const ownersData = await db.select().from(owners);
      const tenantsData = await db.select().from(tenants);
      const tenantDocumentsData = await db.select().from(tenantDocuments);
      const propertiesData = await db.select().from(properties);
      const contractsData = await db.select().from(contracts);
      const contractRenewalsData = await db.select().from(contractRenewals);
      const paymentsData = await db.select().from(payments);
      const deletedPaymentsData = await db.select().from(deletedPayments);
      const contractTemplatesData = await db.select().from(contractTemplates);
      
      // Criar um objeto com todos os dados
      const backup = {
        users: usersData,
        owners: ownersData,
        tenants: tenantsData,
        tenantDocuments: tenantDocumentsData,
        properties: propertiesData,
        contracts: contractsData,
        contractRenewals: contractRenewalsData,
        payments: paymentsData,
        deletedPayments: deletedPaymentsData,
        contractTemplates: contractTemplatesData,
        // Metadados do backup
        metadata: {
          version: "1.1",
          timestamp: new Date().toISOString(),
          description: "Backup completo do banco de dados com documentos de inquilinos"
        }
      };
      
      console.log("Backup criado com sucesso. Tamanho dos dados:");
      console.log(`- Usuários: ${usersData.length}`);
      console.log(`- Proprietários: ${ownersData.length}`);
      console.log(`- Inquilinos: ${tenantsData.length}`);
      console.log(`- Documentos de inquilinos: ${tenantDocumentsData.length}`);
      console.log(`- Imóveis: ${propertiesData.length}`);
      console.log(`- Contratos: ${contractsData.length}`);
      console.log(`- Renovações de contratos: ${contractRenewalsData.length}`);
      console.log(`- Pagamentos: ${paymentsData.length}`);
      console.log(`- Pagamentos excluídos: ${deletedPaymentsData.length}`);
      console.log(`- Modelos de contratos: ${contractTemplatesData.length}`);
      
      return backup;
    } catch (error) {
      console.error("Erro ao criar backup:", error);
      throw new Error("Falha ao criar backup dos dados");
    }
  }
  
  async restoreData(backupData: any, adminUserId: number): Promise<void> {
    // Verificar se o administrador existe
    const adminUser = await this.getUser(adminUserId);
    if (!adminUser) {
      throw new Error("Usuário administrador não encontrado");
    }
    
    if (!backupData || typeof backupData !== 'object') {
      throw new Error("Dados de backup inválidos");
    }
    
    // Função auxiliar para processar datas de forma mais robusta
    const processDate = (dateValue: any): Date | null => {
      if (!dateValue) return null;
      
      try {
        // Se já for um objeto Date, retorna diretamente
        if (dateValue instanceof Date) {
          return dateValue;
        }
        
        // Se for uma string ISO, converte para Date
        if (typeof dateValue === 'string') {
          const date = new Date(dateValue);
          // Verificar se a data é válida
          if (isNaN(date.getTime())) {
            console.warn(`Data inválida: ${dateValue}, usando data atual como fallback`);
            return new Date();
          }
          return date;
        }
        
        // Se for um objeto que tem uma propriedade 'toISOString', converte usando isso
        if (dateValue && typeof dateValue === 'object' && typeof dateValue.toISOString === 'function') {
          return new Date(dateValue.toISOString());
        }
        
        // Tenta converter dados de timestamp numérico
        if (typeof dateValue === 'number') {
          const date = new Date(dateValue);
          // Verificar se a data é válida
          if (isNaN(date.getTime())) {
            console.warn(`Data inválida de timestamp: ${dateValue}, usando data atual como fallback`);
            return new Date();
          }
          return date;
        }
        
        // Para outros formatos, tenta converter para string e depois para Date
        const date = new Date(String(dateValue));
        // Verificar se a data é válida
        if (isNaN(date.getTime())) {
          console.warn(`Data inválida após conversão: ${dateValue}, usando data atual como fallback`);
          return new Date();
        }
        return date;
      } catch (e) {
        console.error("Erro ao converter data:", dateValue, e);
        // Em caso de erro, retorna a data atual como fallback
        return new Date();
      }
    };
    
    // Função avançada para preparar os dados antes de inserir
    const prepareForInsert = (obj: any): any => {
      if (!obj) return obj;
      
      const result = {...obj};
      
      // Lista de campos de data conhecidos para processar
      const dateFields = [
        'createdAt', 'lastLogin', 'deletedAt', 'updatedAt', 
        'uploadedAt', 'renewalDate', 'startDate', 'endDate',
        'dueDate', 'paymentDate', 'firstPaymentDate', 'timestamp'
      ];
      
      // Lista de campos de string de data (que precisam ser parsers para Date primeiro e depois transformados de volta para string ISO)
      const dateStringFields = [
        'startDate', 'endDate', 'dueDate', 'paymentDate', 'firstPaymentDate', 'renewalDate'
      ];
      
      // Processar todos os campos de data conhecidos
      for (const field of dateFields) {
        if (field in result && result[field] !== undefined) {
          if (dateStringFields.includes(field)) {
            // Para campos que precisam ser string de data ISO no formato YYYY-MM-DD
            const dateObj = processDate(result[field]);
            if (dateObj) {
              result[field] = dateObj.toISOString().split('T')[0];
            } else if (result[field]) {
              // Se processDate falhou mas temos um valor, tente uma abordagem direta
              try {
                const date = new Date(result[field]);
                if (!isNaN(date.getTime())) {
                  result[field] = date.toISOString().split('T')[0];
                } else {
                  console.warn(`Data inválida para o campo ${field}: ${result[field]}, usando data atual`);
                  result[field] = new Date().toISOString().split('T')[0];
                }
              } catch (e) {
                console.warn(`Erro ao processar data para o campo ${field}: ${result[field]}, usando data atual`);
                result[field] = new Date().toISOString().split('T')[0];
              }
            }
          } else {
            // Para campos que são objetos Date
            result[field] = processDate(result[field]);
          }
        }
      }
      
      return result;
    };
    
    try {
      // Limpar todos os dados existentes (semelhante ao resetSystem)
      console.log("Iniciando restauração - removendo dados existentes");
      
      // Remover entidades com chaves estrangeiras primeiro
      console.log("Removendo documentos dos inquilinos");
      await db.delete(tenantDocuments);
      
      console.log("Removendo pagamentos excluídos");
      await db.delete(deletedPayments);
      
      console.log("Removendo pagamentos");
      await db.delete(payments);
      
      console.log("Removendo renovações de contratos");
      await db.delete(contractRenewals);
      
      console.log("Removendo contratos");
      await db.delete(contracts);
      
      console.log("Removendo imóveis");
      await db.delete(properties);
      
      console.log("Removendo inquilinos");
      await db.delete(tenants);
      
      console.log("Removendo proprietários");
      await db.delete(owners);
      
      console.log("Removendo modelos de contratos");
      await db.delete(contractTemplates);
      
      // Remover todos os usuários exceto o administrador
      console.log("Removendo usuários exceto o administrador", adminUserId);
      await db.delete(users).where(sql`id != ${adminUserId}`);
      
      // Restaurar os dados do backup
      console.log("Restaurando dados do backup");
      
      try {
        console.log("Restaurando usuários");
        if (backupData.users && Array.isArray(backupData.users)) {
          for (const user of backupData.users) {
            // Não restaurar o usuário administrador atual
            if (user.id !== adminUserId) {
              const preparedUser = prepareForInsert(user);
              // Garantir que os campos obrigatórios estejam presentes
              if (!preparedUser.role) preparedUser.role = 'user';
              if (preparedUser.isActive === undefined) preparedUser.isActive = true;
              
              await db.insert(users).values(preparedUser).onConflictDoNothing();
            }
          }
        }
      } catch (error) {
        console.error("Erro ao restaurar usuários:", error);
        // Continuar com o processo
      }
      
      try {
        console.log("Restaurando proprietários");
        if (backupData.owners && Array.isArray(backupData.owners)) {
          for (const owner of backupData.owners) {
            const preparedOwner = prepareForInsert(owner);
            
            // Converter endereço para string se necessário
            if (preparedOwner.address && typeof preparedOwner.address !== 'string') {
              preparedOwner.address = JSON.stringify(preparedOwner.address);
            }
            
            // Garantir que os campos obrigatórios estejam presentes
            if (preparedOwner.isActive === undefined) preparedOwner.isActive = true;
            
            await db.insert(owners).values(preparedOwner).onConflictDoNothing();
          }
        }
      } catch (error) {
        console.error("Erro ao restaurar proprietários:", error);
        // Continuar com o processo
      }
      
      try {
        console.log("Restaurando inquilinos");
        if (backupData.tenants && Array.isArray(backupData.tenants)) {
          for (const tenant of backupData.tenants) {
            const preparedTenant = prepareForInsert(tenant);
            
            // Converter endereço para string se necessário
            if (preparedTenant.address && typeof preparedTenant.address !== 'string') {
              preparedTenant.address = JSON.stringify(preparedTenant.address);
            }
            
            // Converter garantidor para string se necessário
            if (preparedTenant.guarantor && typeof preparedTenant.guarantor !== 'string') {
              preparedTenant.guarantor = JSON.stringify(preparedTenant.guarantor);
            }
            
            // Garantir que os campos obrigatórios estejam presentes
            if (preparedTenant.isActive === undefined) preparedTenant.isActive = true;
            
            await db.insert(tenants).values(preparedTenant).onConflictDoNothing();
          }
        }
      } catch (error) {
        console.error("Erro ao restaurar inquilinos:", error);
        // Continuar com o processo
      }
      
      try {
        console.log("Restaurando imóveis");
        if (backupData.properties && Array.isArray(backupData.properties)) {
          console.log(`Encontrados ${backupData.properties.length} imóveis no backup`);
          
          // Verificando uma amostra do primeiro imóvel (se existir)
          if (backupData.properties.length > 0) {
            console.log("Amostra do primeiro imóvel no backup:", 
              JSON.stringify(backupData.properties[0], null, 2).substring(0, 500) + "...");
          }
          
          for (const property of backupData.properties) {
            try {
              const preparedProperty = prepareForInsert(property);
              
              // Verificar campos obrigatórios
              if (!preparedProperty.ownerId) {
                console.log(`Imóvel sem ownerId, pulando: ${JSON.stringify(preparedProperty).substring(0, 100)}...`);
                continue;
              }
              
              if (!preparedProperty.type) {
                preparedProperty.type = 'residencial';
              }
              
              if (!preparedProperty.rentValue || isNaN(preparedProperty.rentValue)) {
                console.log(`Imóvel sem rentValue válido, definindo como 0: ${JSON.stringify(preparedProperty).substring(0, 100)}...`);
                preparedProperty.rentValue = 0;
              }
              
              // Converter endereço para string se necessário
              if (preparedProperty.address && typeof preparedProperty.address !== 'string') {
                preparedProperty.address = JSON.stringify(preparedProperty.address);
              } else if (!preparedProperty.address) {
                console.log(`Imóvel sem endereço, pulando: ${JSON.stringify(preparedProperty).substring(0, 100)}...`);
                continue;
              }
              
              // Garantir que os campos obrigatórios estejam presentes
              if (preparedProperty.isActive === undefined) preparedProperty.isActive = true;
              
              console.log(`Inserindo imóvel com ID ${preparedProperty.id}, proprietário ${preparedProperty.ownerId}`);
              const result = await db.insert(properties).values(preparedProperty).onConflictDoNothing();
              console.log(`Imóvel inserido com sucesso:`, result);
            } catch (propertyError) {
              console.error(`Erro ao processar imóvel individual:`, propertyError);
              console.error(`Dados do imóvel com problema:`, JSON.stringify(property).substring(0, 200) + "...");
            }
          }
        } else {
          console.log("Nenhum imóvel encontrado no backup ou formato inválido:", 
            typeof backupData.properties, backupData.properties ? "length: " + backupData.properties.length : "undefined");
        }
      } catch (error) {
        console.error("Erro ao restaurar imóveis:", error);
        // Continuar com o processo
      }
      
      try {
        console.log("Restaurando contratos");
        if (backupData.contracts && Array.isArray(backupData.contracts)) {
          console.log(`Encontrados ${backupData.contracts.length} contratos no backup`);
          
          // Verificando uma amostra do primeiro contrato (se existir)
          if (backupData.contracts.length > 0) {
            console.log("Amostra do primeiro contrato no backup:", 
              JSON.stringify(backupData.contracts[0], null, 2).substring(0, 500) + "...");
          }
          
          for (const contract of backupData.contracts) {
            try {
              const preparedContract = prepareForInsert(contract);
              
              // Verificando campos obrigatórios
              if (!preparedContract.ownerId || !preparedContract.tenantId || !preparedContract.propertyId) {
                console.log(`Contrato sem campos obrigatórios, pulando: ${JSON.stringify(preparedContract).substring(0, 100)}...`);
                continue;
              }
              
              // Verificando se o proprietário, inquilino e imóvel existem
              const ownerExists = await db.select({ id: owners.id }).from(owners).where(eq(owners.id, preparedContract.ownerId));
              const tenantExists = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, preparedContract.tenantId));
              const propertyExists = await db.select({ id: properties.id }).from(properties).where(eq(properties.id, preparedContract.propertyId));
              
              if (ownerExists.length === 0) {
                console.log(`Proprietário ${preparedContract.ownerId} não encontrado, pulando contrato ${preparedContract.id}`);
                continue;
              }
              
              if (tenantExists.length === 0) {
                console.log(`Inquilino ${preparedContract.tenantId} não encontrado, pulando contrato ${preparedContract.id}`);
                continue;
              }
              
              if (propertyExists.length === 0) {
                console.log(`Imóvel ${preparedContract.propertyId} não encontrado, pulando contrato ${preparedContract.id}`);
                continue;
              }
              
              // Garantir que campos obrigatórios estejam presentes
              if (!preparedContract.status) preparedContract.status = 'active';
              if (preparedContract.isRenewal === undefined) preparedContract.isRenewal = false;
              if (!preparedContract.startDate) {
                console.log(`Contrato sem data de início, pulando: ${JSON.stringify(preparedContract).substring(0, 100)}...`);
                continue;
              }
              if (!preparedContract.endDate) {
                console.log(`Contrato sem data de término, pulando: ${JSON.stringify(preparedContract).substring(0, 100)}...`);
                continue;
              }
              if (!preparedContract.duration || isNaN(preparedContract.duration)) {
                preparedContract.duration = 12; // Padrão de 12 meses
              }
              if (!preparedContract.rentValue || isNaN(preparedContract.rentValue)) {
                console.log(`Contrato sem valor de aluguel válido, pulando: ${JSON.stringify(preparedContract).substring(0, 100)}...`);
                continue;
              }
              if (!preparedContract.firstPaymentDate) {
                console.log(`Contrato sem data do primeiro pagamento, pulando: ${JSON.stringify(preparedContract).substring(0, 100)}...`);
                continue;
              }
              
              console.log(`Inserindo contrato ${preparedContract.id} (proprietário: ${preparedContract.ownerId}, inquilino: ${preparedContract.tenantId}, imóvel: ${preparedContract.propertyId})`);
              const result = await db.insert(contracts).values(preparedContract).onConflictDoNothing();
              console.log(`Contrato inserido com sucesso:`, result);
            } catch (contractError) {
              console.error(`Erro ao processar contrato individual:`, contractError);
              console.error(`Dados do contrato com problema:`, JSON.stringify(contract).substring(0, 200) + "...");
            }
          }
        } else {
          console.log("Nenhum contrato encontrado no backup ou formato inválido:", 
            typeof backupData.contracts, backupData.contracts ? "length: " + backupData.contracts.length : "undefined");
        }
      } catch (error) {
        console.error("Erro ao restaurar contratos:", error);
        // Continuar com o processo
      }
      
      try {
        console.log("Restaurando renovações de contratos");
        if (backupData.contractRenewals && Array.isArray(backupData.contractRenewals)) {
          for (const renewal of backupData.contractRenewals) {
            const preparedRenewal = prepareForInsert(renewal);
            
            // Garantir que ajustmentIndex esteja presente
            if (!preparedRenewal.adjustmentIndex) {
              preparedRenewal.adjustmentIndex = 'IPCA';
            }
            
            await db.insert(contractRenewals).values(preparedRenewal).onConflictDoNothing();
          }
        }
      } catch (error) {
        console.error("Erro ao restaurar renovações de contratos:", error);
        // Continuar com o processo
      }
      
      try {
        console.log("Restaurando pagamentos");
        if (backupData.payments && Array.isArray(backupData.payments)) {
          for (const payment of backupData.payments) {
            const preparedPayment = prepareForInsert(payment);
            
            // Garantir valores padrão para campos obrigatórios
            if (preparedPayment.isPaid === undefined) preparedPayment.isPaid = false;
            if (preparedPayment.isRestored === undefined) preparedPayment.isRestored = false;
            
            await db.insert(payments).values(preparedPayment).onConflictDoNothing();
          }
        }
      } catch (error) {
        console.error("Erro ao restaurar pagamentos:", error);
        // Continuar com o processo
      }
      
      try {
        console.log("Restaurando pagamentos excluídos");
        if (backupData.deletedPayments && Array.isArray(backupData.deletedPayments)) {
          for (const deletedPayment of backupData.deletedPayments) {
            const preparedDeletedPayment = prepareForInsert(deletedPayment);
            
            // Garantir valores padrão para campos obrigatórios
            if (preparedDeletedPayment.wasRestored === undefined) {
              preparedDeletedPayment.wasRestored = false;
            }
            
            await db.insert(deletedPayments).values(preparedDeletedPayment).onConflictDoNothing();
          }
        }
      } catch (error) {
        console.error("Erro ao restaurar pagamentos excluídos:", error);
        // Continuar com o processo
      }
      
      console.log("Restaurando modelos de contratos");
      try {
        console.log("Restaurando modelos de contratos");
        if (backupData.contractTemplates && Array.isArray(backupData.contractTemplates)) {
          for (const template of backupData.contractTemplates) {
            const preparedTemplate = prepareForInsert(template);
            
            // Garantir que todos os campos necessários estão presentes 
            if (!preparedTemplate.type) {
              preparedTemplate.type = 'residencial'; // valor padrão
            }
            
            if (preparedTemplate.isActive === undefined) {
              preparedTemplate.isActive = true;
            }
            
            await db.insert(contractTemplates).values(preparedTemplate).onConflictDoNothing();
          }
        }
      } catch (error) {
        console.error("Erro ao restaurar modelos de contratos:", error);
        // Continuar mesmo com erro nesta etapa
      }
      
      try {
        console.log("Restaurando documentos dos inquilinos");
        if (backupData.tenantDocuments && Array.isArray(backupData.tenantDocuments)) {
          for (const document of backupData.tenantDocuments) {
            const preparedDocument = prepareForInsert(document);
            await db.insert(tenantDocuments).values(preparedDocument).onConflictDoNothing();
          }
        }
      } catch (error) {
        console.error("Erro ao restaurar documentos dos inquilinos:", error);
        // Continuar mesmo com erro nesta etapa
      }
      
      console.log("Restauração de dados concluída com sucesso. Quantidades restauradas:");
      console.log(`- Usuários: ${(backupData.users || []).length}`);
      console.log(`- Proprietários: ${(backupData.owners || []).length}`);
      console.log(`- Inquilinos: ${(backupData.tenants || []).length}`);
      console.log(`- Documentos de inquilinos: ${(backupData.tenantDocuments || []).length}`);
      console.log(`- Imóveis: ${(backupData.properties || []).length}`);
      console.log(`- Contratos: ${(backupData.contracts || []).length}`);
      console.log(`- Renovações de contratos: ${(backupData.contractRenewals || []).length}`);
      console.log(`- Pagamentos: ${(backupData.payments || []).length}`);
      console.log(`- Pagamentos excluídos: ${(backupData.deletedPayments || []).length}`);
      console.log(`- Modelos de contratos: ${(backupData.contractTemplates || []).length}`);
    } catch (error) {
      console.error("Erro ao restaurar dados:", error);
      throw new Error("Falha ao restaurar dados do backup");
    }
  }
  
  // Métodos para obter informações relacionadas ao contrato
  async getOwnerByContractId(contractId: number): Promise<Owner | undefined> {
    const contract = await this.getContract(contractId);
    if (!contract) return undefined;
    return this.getOwner(contract.ownerId);
  }
  
  async getTenantByContractId(contractId: number): Promise<Tenant | undefined> {
    const contract = await this.getContract(contractId);
    if (!contract) return undefined;
    return this.getTenant(contract.tenantId);
  }
  
  async getPropertyByContractId(contractId: number): Promise<Property | undefined> {
    const contract = await this.getContract(contractId);
    if (!contract) return undefined;
    return this.getProperty(contract.propertyId);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        isActive: true,
        createdAt: new Date()
      })
      .returning();
    return user;
  }
  
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async updateUser(id: number, partialUser: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(partialUser)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  async updateLastLogin(id: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return result.rowCount! > 0;
  }
  
  // Admin operations
  async resetSystem(adminUserId: number): Promise<void> {
    // Verificar se o usuário é administrador
    const admin = await this.getUser(adminUserId);
    if (!admin || admin.role !== 'admin') {
      throw new Error("Operação permitida apenas para administradores");
    }
    
    try {
      console.log("Iniciando reset do sistema pelo admin ID:", adminUserId);
      
      // 1. Primeiro remover documentos dos inquilinos para evitar violação de chave estrangeira
      console.log("Removendo documentos dos inquilinos");
      await db.delete(tenantDocuments);
      
      // 2. Remover pagamentos excluídos
      console.log("Removendo pagamentos excluídos");
      await db.delete(deletedPayments);
      
      // 3. Remover pagamentos ativos
      console.log("Removendo pagamentos");
      await db.delete(payments);
      
      // 4. Remover renovações de contratos
      console.log("Removendo renovações de contratos");
      await db.delete(contractRenewals);
      
      // 5. Remover contratos
      console.log("Removendo contratos");
      await db.delete(contracts);
      
      // 6. Remover imóveis
      console.log("Removendo imóveis");
      await db.delete(properties);
      
      // 7. Remover inquilinos (agora é seguro porque não há mais documentos)
      console.log("Removendo inquilinos");
      await db.delete(tenants);
      
      // 8. Remover proprietários
      console.log("Removendo proprietários");
      await db.delete(owners);
      
      // 9. Remover usuários exceto o administrador
      console.log("Removendo usuários exceto o administrador", adminUserId);
      await db
        .delete(users)
        .where(sql`${users.id} <> ${adminUserId}`);
      
      console.log("Sistema resetado com sucesso pelo administrador ID:", adminUserId);
    } catch (error) {
      console.error("Erro ao resetar sistema:", error);
      throw error;
    }
  }

  async getOwners(showInactive: boolean = false): Promise<Owner[]> {
    try {
      console.log("Buscando proprietários do banco de dados");
      let query = db.select().from(owners);
      
      // Se não mostrar inativos, filtra apenas os ativos
      if (!showInactive) {
        query = query.where(eq(owners.isActive, true));
      }
      
      const ownersData = await query;
      console.log("Proprietários encontrados:", ownersData.length);
      
      return ownersData.map(owner => ({
        ...owner,
        address: typeof owner.address === 'string' ? JSON.parse(owner.address) : owner.address
      }));
    } catch (error) {
      console.error("Erro ao buscar proprietários:", error);
      throw error;
    }
  }

  async getOwner(id: number): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    if (!owner) return undefined;
    
    return {
      ...owner,
      address: typeof owner.address === 'string' ? JSON.parse(owner.address) : owner.address
    };
  }
  
  async findOwnerByDocument(document: string): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.document, document));
    if (!owner) return undefined;
    
    return {
      ...owner,
      address: typeof owner.address === 'string' ? JSON.parse(owner.address) : owner.address
    };
  }

  async createOwner(insertOwner: InsertOwner): Promise<Owner> {
    try {
      console.log("Criando proprietário:", JSON.stringify(insertOwner, null, 2));
      
      const addressJson = JSON.stringify(insertOwner.address);
      console.log("Address JSON:", addressJson);
      
      const insertValues = {
        name: insertOwner.name,
        document: insertOwner.document,
        email: insertOwner.email,
        phone: insertOwner.phone,
        address: addressJson,
      };
      console.log("Valores para inserção:", JSON.stringify(insertValues, null, 2));
      
      const [owner] = await db
        .insert(owners)
        .values(insertValues)
        .returning();
      
      console.log("Proprietário criado:", JSON.stringify(owner, null, 2));
      
      return {
        ...owner,
        address: typeof owner.address === 'string' ? JSON.parse(owner.address) : owner.address
      };
    } catch (error) {
      console.error("Erro ao criar proprietário:", error);
      throw error;
    }
  }

  async updateOwner(id: number, partialOwner: Partial<InsertOwner>): Promise<Owner | undefined> {
    // Ensure we have the current owner
    const currentOwner = await this.getOwner(id);
    if (!currentOwner) return undefined;

    const updateData: any = { ...partialOwner };
    
    // Handle the address field if it's being updated
    if (partialOwner.address) {
      updateData.address = JSON.stringify(partialOwner.address);
    }

    const [updatedOwner] = await db
      .update(owners)
      .set(updateData)
      .where(eq(owners.id, id))
      .returning();
    
    if (!updatedOwner) return undefined;
    
    return {
      ...updatedOwner,
      address: typeof updatedOwner.address === 'string' ? JSON.parse(updatedOwner.address) : updatedOwner.address
    };
  }

  async deleteOwner(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(owners)
        .where(eq(owners.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting owner:", error);
      return false;
    }
  }

  async getTenants(showInactive: boolean = false): Promise<Tenant[]> {
    let query = db.select().from(tenants);
      
    // Se não mostrar inativos, filtra apenas os ativos
    if (!showInactive) {
      query = query.where(eq(tenants.isActive, true));
    }
    
    const tenantsData = await query;
    return tenantsData.map(tenant => ({
      ...tenant,
      address: typeof tenant.address === 'string' ? JSON.parse(tenant.address) : tenant.address,
      guarantor: tenant.guarantor ? 
        (typeof tenant.guarantor === 'string' ? JSON.parse(tenant.guarantor) : tenant.guarantor) 
        : undefined
    }));
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) return undefined;
    
    return {
      ...tenant,
      address: typeof tenant.address === 'string' ? JSON.parse(tenant.address) : tenant.address,
      guarantor: tenant.guarantor ? 
        (typeof tenant.guarantor === 'string' ? JSON.parse(tenant.guarantor) : tenant.guarantor) 
        : undefined
    };
  }
  
  async findTenantByDocument(document: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.document, document));
    if (!tenant) return undefined;
    
    return {
      ...tenant,
      address: typeof tenant.address === 'string' ? JSON.parse(tenant.address) : tenant.address,
      guarantor: tenant.guarantor ? 
        (typeof tenant.guarantor === 'string' ? JSON.parse(tenant.guarantor) : tenant.guarantor) 
        : undefined
    };
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    try {
      console.log("Criando inquilino:", JSON.stringify(insertTenant, null, 2));
      
      const addressJson = JSON.stringify(insertTenant.address);
      console.log("Address JSON:", addressJson);
      
      const guarantorJson = insertTenant.guarantor ? JSON.stringify(insertTenant.guarantor) : null;
      console.log("Guarantor JSON:", guarantorJson);
      
      const insertValues = {
        ...insertTenant,
        address: addressJson,
        guarantor: guarantorJson,
      };
      console.log("Valores para inserção:", JSON.stringify(insertValues, null, 2));
      
      const [tenant] = await db
        .insert(tenants)
        .values(insertValues)
        .returning();
      
      console.log("Inquilino criado:", JSON.stringify(tenant, null, 2));
      
      return {
        ...tenant,
        address: typeof tenant.address === 'string' ? JSON.parse(tenant.address) : tenant.address,
        guarantor: tenant.guarantor ? 
          (typeof tenant.guarantor === 'string' ? JSON.parse(tenant.guarantor) : tenant.guarantor) 
          : undefined
      };
    } catch (error) {
      console.error("Erro ao criar inquilino:", error);
      throw error;
    }
  }

  async updateTenant(id: number, partialTenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    // Ensure we have the current tenant
    const currentTenant = await this.getTenant(id);
    if (!currentTenant) return undefined;

    const updateData: any = { ...partialTenant };
    
    // Handle the address field if it's being updated
    if (partialTenant.address) {
      updateData.address = JSON.stringify(partialTenant.address);
    }
    
    // Handle the guarantor field if it's being updated
    if (partialTenant.guarantor !== undefined) {
      updateData.guarantor = partialTenant.guarantor ? JSON.stringify(partialTenant.guarantor) : null;
    }

    const [updatedTenant] = await db
      .update(tenants)
      .set(updateData)
      .where(eq(tenants.id, id))
      .returning();
    
    if (!updatedTenant) return undefined;
    
    return {
      ...updatedTenant,
      address: typeof updatedTenant.address === 'string' ? JSON.parse(updatedTenant.address) : updatedTenant.address,
      guarantor: updatedTenant.guarantor ? 
        (typeof updatedTenant.guarantor === 'string' ? JSON.parse(updatedTenant.guarantor) : updatedTenant.guarantor) 
        : undefined
    };
  }

  async deleteTenant(id: number): Promise<boolean> {
    try {
      await db
        .delete(tenants)
        .where(eq(tenants.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting tenant:", error);
      return false;
    }
  }

  async getProperties(showInactive: boolean = false): Promise<Property[]> {
    try {
      let query = db.select().from(properties);
      
      // Se não mostrar inativos, filtra apenas os ativos
      if (!showInactive) {
        query = query.where(eq(properties.isActive, true));
      }
      
      const propertiesData = await query;
      
      return propertiesData.map(property => ({
        ...property,
        address: typeof property.address === 'string' ? JSON.parse(property.address) : property.address
      }));
    } catch (error) {
      console.error("Erro ao buscar imóveis:", error);
      throw error;
    }
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    if (!property) return undefined;
    
    return {
      ...property,
      address: typeof property.address === 'string' ? JSON.parse(property.address) : property.address
    };
  }

  async getPropertiesByOwner(ownerId: number): Promise<Property[]> {
    const propertiesData = await db
      .select()
      .from(properties)
      .where(eq(properties.ownerId, ownerId));
    
    return propertiesData.map(property => ({
      ...property,
      address: typeof property.address === 'string' ? JSON.parse(property.address) : property.address
    }));
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    try {
      console.log("Criando imóvel:", JSON.stringify(insertProperty, null, 2));
      
      const addressJson = JSON.stringify(insertProperty.address);
      console.log("Address JSON:", addressJson);
      
      // Separando as propriedades para garantir que apenas os campos corretos são enviados
      const insertValues = {
        ownerId: insertProperty.ownerId,
        name: insertProperty.name || null, // Adicionando o campo name
        type: insertProperty.type,
        address: addressJson,
        rentValue: insertProperty.rentValue,
        bedrooms: insertProperty.bedrooms || null,
        bathrooms: insertProperty.bathrooms || null,
        area: insertProperty.area || null,
        description: insertProperty.description || null,
        availableForRent: insertProperty.availableForRent === undefined ? true : insertProperty.availableForRent,
        waterCompany: insertProperty.waterCompany || null,
        waterAccountNumber: insertProperty.waterAccountNumber || null,
        electricityCompany: insertProperty.electricityCompany || null,
        electricityAccountNumber: insertProperty.electricityAccountNumber || null
      };
      
      console.log("Valores para inserção:", JSON.stringify(insertValues, null, 2));
      
      const [property] = await db
        .insert(properties)
        .values(insertValues)
        .returning();
      
      console.log("Imóvel criado:", JSON.stringify(property, null, 2));
      
      return {
        ...property,
        address: typeof property.address === 'string' ? JSON.parse(property.address) : property.address
      };
    } catch (error) {
      console.error("Erro ao criar imóvel:", error);
      throw error;
    }
  }

  async updateProperty(id: number, partialProperty: Partial<InsertProperty>): Promise<Property | undefined> {
    // Ensure we have the current property
    const currentProperty = await this.getProperty(id);
    if (!currentProperty) return undefined;

    const updateData: any = { ...partialProperty };
    
    // Handle the address field if it's being updated
    if (partialProperty.address) {
      updateData.address = JSON.stringify(partialProperty.address);
    }

    const [updatedProperty] = await db
      .update(properties)
      .set(updateData)
      .where(eq(properties.id, id))
      .returning();
    
    if (!updatedProperty) return undefined;
    
    return {
      ...updatedProperty,
      address: typeof updatedProperty.address === 'string' ? JSON.parse(updatedProperty.address) : updatedProperty.address
    };
  }

  async deleteProperty(id: number): Promise<boolean> {
    try {
      await db
        .delete(properties)
        .where(eq(properties.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting property:", error);
      return false;
    }
  }

  async getContracts(): Promise<Contract[]> {
    const contractsData = await db.select().from(contracts);
    return contractsData;
  }

  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id));
    
    return contract || undefined;
  }

  async getContractsByOwner(ownerId: number): Promise<Contract[]> {
    const contractsData = await db
      .select()
      .from(contracts)
      .where(eq(contracts.ownerId, ownerId));
    
    return contractsData;
  }

  async getContractsByTenant(tenantId: number): Promise<Contract[]> {
    const contractsData = await db
      .select()
      .from(contracts)
      .where(eq(contracts.tenantId, tenantId));
    
    return contractsData;
  }

  async getContractsByProperty(propertyId: number): Promise<Contract[]> {
    const contractsData = await db
      .select()
      .from(contracts)
      .where(eq(contracts.propertyId, propertyId));
    
    return contractsData;
  }

  async createContract(insertContract: InsertContract): Promise<Contract> {
    try {
      console.log("Criando contrato:", JSON.stringify(insertContract, null, 2));
      
      const insertValues = {
        ownerId: insertContract.ownerId,
        tenantId: insertContract.tenantId,
        propertyId: insertContract.propertyId,
        startDate: insertContract.startDate,
        endDate: insertContract.endDate,
        duration: insertContract.duration,
        rentValue: insertContract.rentValue,
        firstPaymentDate: insertContract.firstPaymentDate,
        status: insertContract.status || 'ativo',
        observations: insertContract.observations || null,
        isRenewal: insertContract.isRenewal || false,
        originalContractId: insertContract.originalContractId || null
      };
      
      console.log("Valores para inserção:", JSON.stringify(insertValues, null, 2));
      
      const [contract] = await db
        .insert(contracts)
        .values(insertValues)
        .returning();
      
      console.log("Contrato criado:", JSON.stringify(contract, null, 2));
      
      return contract;
    } catch (error) {
      console.error("Erro ao criar contrato:", error);
      throw error;
    }
  }

  async updateContract(id: number, partialContract: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updatedContract] = await db
      .update(contracts)
      .set(partialContract)
      .where(eq(contracts.id, id))
      .returning();
    
    return updatedContract || undefined;
  }

  async deleteContract(id: number): Promise<{ success: boolean; hasPaidPayments: boolean; paidPaymentIds?: number[] }> {
    try {
      console.log(`Iniciando exclusão do contrato #${id}`);
      
      // Primeiro verificar se existem parcelas pagas
      const contractPayments = await this.getPaymentsByContract(id);
      const paidPayments = contractPayments.filter(payment => payment.isPaid);
      
      if (paidPayments.length > 0) {
        // Se existem parcelas pagas, retornar erro
        console.log(`Contrato #${id} possui parcelas pagas, não pode ser excluído`);
        return { 
          success: false, 
          hasPaidPayments: true, 
          paidPaymentIds: paidPayments.map(payment => payment.id) 
        };
      }
      
      // Verificar se o contrato existe antes de continuar
      const contract = await this.getContract(id);
      if (!contract) {
        console.log(`Contrato #${id} não encontrado`);
        return { success: false, hasPaidPayments: false };
      }
      
      // Verificar se este contrato tem relação com renovações (como original ou como renovado)
      const renewalsAsOriginal = await this.getContractRenewalsByOriginalContract(id);
      if (renewalsAsOriginal.length > 0) {
        console.log(`Contrato #${id} é o contrato original de ${renewalsAsOriginal.length} renovações, não pode ser excluído`);
        return { success: false, hasPaidPayments: false };
      }
      
      // Verificar se tem renovação como contrato renovado
      const renewalAsNew = await this.getContractRenewalByNewContract(id);
      if (renewalAsNew) {
        console.log(`Contrato #${id} é um contrato renovado, excluindo registro de renovação`);
        // Excluir o registro de renovação antes
        await db
          .delete(contractRenewals)
          .where(eq(contractRenewals.contractId, id));
      }
      
      // Excluir todas as parcelas do contrato primeiro
      console.log(`Excluindo parcelas do contrato #${id}`);
      await db
        .delete(payments)
        .where(eq(payments.contractId, id));
      
      // Depois excluir o contrato
      console.log(`Excluindo contrato #${id}`);
      await db
        .delete(contracts)
        .where(eq(contracts.id, id));
      
      return { success: true, hasPaidPayments: false };
    } catch (error) {
      console.error(`Erro ao excluir contrato #${id}:`, error);
      return { success: false, hasPaidPayments: false };
    }
  }

  // CONTRACT RENEWAL METHODS
  async getContractRenewals(): Promise<ContractRenewal[]> {
    const renewalsData = await db.select().from(contractRenewals);
    return renewalsData;
  }

  async getContractRenewal(id: number): Promise<ContractRenewal | undefined> {
    const [renewal] = await db
      .select()
      .from(contractRenewals)
      .where(eq(contractRenewals.id, id));
    
    return renewal || undefined;
  }

  async getContractRenewalsByContract(contractId: number): Promise<ContractRenewal[]> {
    const renewalsData = await db
      .select()
      .from(contractRenewals)
      .where(eq(contractRenewals.contractId, contractId));
    
    return renewalsData;
  }

  async getContractRenewalsByOriginalContract(originalContractId: number): Promise<ContractRenewal[]> {
    const renewalsData = await db
      .select()
      .from(contractRenewals)
      .where(eq(contractRenewals.originalContractId, originalContractId));
    
    return renewalsData;
  }
  
  // Método para buscar renovação pelo ID do contrato renovado
  async getContractRenewalByNewContractId(contractId: number): Promise<ContractRenewal | undefined> {
    const [renewal] = await db
      .select()
      .from(contractRenewals)
      .where(eq(contractRenewals.contractId, contractId));
    
    return renewal || undefined;
  }

  async createContractRenewal(insertRenewal: InsertContractRenewal): Promise<ContractRenewal> {
    try {
      console.log("Criando renovação de contrato:", JSON.stringify(insertRenewal, null, 2));
      
      const insertValues = {
        contractId: insertRenewal.contractId,
        originalContractId: insertRenewal.originalContractId,
        startDate: insertRenewal.startDate,
        endDate: insertRenewal.endDate,
        renewalDate: insertRenewal.renewalDate,
        newRentValue: insertRenewal.newRentValue,
        adjustmentIndex: insertRenewal.adjustmentIndex || '',
        observations: insertRenewal.observations || null
      };
      
      console.log("Valores para inserção:", JSON.stringify(insertValues, null, 2));
      
      const [renewal] = await db
        .insert(contractRenewals)
        .values(insertValues)
        .returning();
      
      console.log("Renovação de contrato criada:", JSON.stringify(renewal, null, 2));
      
      return renewal;
    } catch (error) {
      console.error("Erro ao criar renovação de contrato:", error);
      throw error;
    }
  }

  async updateContractRenewal(id: number, partialRenewal: Partial<InsertContractRenewal>): Promise<ContractRenewal | undefined> {
    const [updatedRenewal] = await db
      .update(contractRenewals)
      .set(partialRenewal)
      .where(eq(contractRenewals.id, id))
      .returning();
    
    return updatedRenewal || undefined;
  }

  async deleteContractRenewal(id: number): Promise<boolean> {
    try {
      await db
        .delete(contractRenewals)
        .where(eq(contractRenewals.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting contract renewal:", error);
      return false;
    }
  }

  async getPayments(): Promise<Payment[]> {
    const paymentsData = await db.select().from(payments);
    return paymentsData;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id));
    
    return payment || undefined;
  }

  async getPaymentsByContract(contractId: number): Promise<Payment[]> {
    const paymentsData = await db
      .select()
      .from(payments)
      .where(eq(payments.contractId, contractId));
    
    return paymentsData;
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    try {
      console.log("Criando pagamento:", JSON.stringify(insertPayment, null, 2));
      
      const insertValues = {
        contractId: insertPayment.contractId,
        dueDate: insertPayment.dueDate,
        value: insertPayment.value,
        isPaid: insertPayment.isPaid !== undefined ? insertPayment.isPaid : false,
        paymentDate: insertPayment.paymentDate || null,
        interestAmount: insertPayment.interestAmount || 0,
        latePaymentFee: insertPayment.latePaymentFee || 0,
        paymentMethod: insertPayment.paymentMethod || null,
        receiptNumber: insertPayment.receiptNumber || null,
        observations: insertPayment.observations || null,
        installmentNumber: insertPayment.installmentNumber || null // Incluir o número da parcela
      };
      
      console.log("Valores para inserção:", JSON.stringify(insertValues, null, 2));
      
      const [payment] = await db
        .insert(payments)
        .values(insertValues)
        .returning();
      
      console.log("Pagamento criado:", JSON.stringify(payment, null, 2));
      
      return payment;
    } catch (error) {
      console.error("Erro ao criar pagamento:", error);
      throw error;
    }
  }

  async updatePayment(id: number, partialPayment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updatedPayment] = await db
      .update(payments)
      .set(partialPayment)
      .where(eq(payments.id, id))
      .returning();
    
    return updatedPayment || undefined;
  }

  async deletePayment(id: number, userId: number): Promise<boolean> {
    try {
      // Primeiro, recupera o pagamento para armazenar os detalhes
      const [payment] = await db.select().from(payments).where(eq(payments.id, id));
      
      if (!payment) {
        return false;
      }
      
      // Insere o registro na tabela de pagamentos excluídos
      await db.insert(deletedPayments).values({
        originalId: payment.id,
        contractId: payment.contractId,
        dueDate: payment.dueDate,
        value: payment.value,
        isPaid: payment.isPaid || false,
        paymentDate: payment.paymentDate,
        interestAmount: payment.interestAmount || 0,
        latePaymentFee: payment.latePaymentFee || 0,
        paymentMethod: payment.paymentMethod,
        receiptNumber: payment.receiptNumber,
        observations: payment.observations,
        deletedBy: userId,
        installmentNumber: payment.installmentNumber || 0, // Preservar o número da parcela
        originalCreatedAt: payment.createdAt,
        deletedAt: new Date(),
        wasRestored: payment.isRestored || false // Registra se o pagamento era um restaurado
      });
      
      // Remove o pagamento original
      await db.delete(payments).where(eq(payments.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting payment:", error);
      return false;
    }
  }
  
  // Métodos para pagamentos excluídos
  async getDeletedPayments(): Promise<DeletedPayment[]> {
    return await db.select().from(deletedPayments)
      .orderBy(desc(deletedPayments.deletedAt));
  }
  
  async getDeletedPaymentsByContract(contractId: number): Promise<DeletedPayment[]> {
    return await db.select().from(deletedPayments)
      .where(eq(deletedPayments.contractId, contractId))
      .orderBy(desc(deletedPayments.deletedAt));
  }
  
  async getDeletedPaymentsByUser(userId: number): Promise<DeletedPayment[]> {
    return await db.select().from(deletedPayments)
      .where(eq(deletedPayments.deletedBy, userId))
      .orderBy(desc(deletedPayments.deletedAt));
  }
  
  async restoreDeletedPayment(id: number): Promise<Payment | undefined> {
    try {
      // Obter o pagamento excluído
      const [deletedPayment] = await db.select().from(deletedPayments)
        .where(eq(deletedPayments.id, id));
      
      if (!deletedPayment) return undefined;
      
      // Criar um novo pagamento baseado no excluído
      const [newPayment] = await db.insert(payments).values({
        contractId: deletedPayment.contractId,
        value: deletedPayment.value,
        dueDate: deletedPayment.dueDate,
        observations: deletedPayment.observations,
        isPaid: null,  // Resetar status de pagamento
        paymentDate: null,
        interestAmount: null,
        latePaymentFee: null, 
        paymentMethod: null,
        receiptNumber: null,
        isRestored: true, // Marcar como restaurado
        installmentNumber: deletedPayment.installmentNumber || 0, // Manter o número da parcela original
        createdAt: deletedPayment.originalCreatedAt || new Date()
      }).returning();
      
      // Remover o pagamento excluído
      await db.delete(deletedPayments).where(eq(deletedPayments.id, id));
      
      return newPayment;
    } catch (error) {
      console.error("Erro ao restaurar pagamento excluído:", error);
      return undefined;
    }
  }

  async getDashboardStats(): Promise<{
    expiredContracts: number;
    expiringContracts: number;
    totalContracts: number;
    pendingPayments: number;
    overduePayments: number;
  }> {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const formattedToday = today.toISOString().split('T')[0];
    const formattedThirtyDaysFromNow = thirtyDaysFromNow.toISOString().split('T')[0];

    // Get total contracts
    const allContracts = await db.select().from(contracts);
    const totalContracts = allContracts.length;
    
    // Get expired contracts
    const expiredContractsData = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.status, 'ativo'),
          lt(contracts.endDate, formattedToday)
        )
      );
    const expiredContracts = expiredContractsData.length;
    
    // Get expiring contracts
    const expiringContractsData = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.status, 'ativo'),
          gte(contracts.endDate, formattedToday),
          lte(contracts.endDate, formattedThirtyDaysFromNow)
        )
      );
    const expiringContracts = expiringContractsData.length;
    
    // Get overdue payments (past due date and unpaid)
    const overduePaymentsData = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.isPaid, false),
          lt(payments.dueDate, formattedToday)
        )
      );
    const overduePayments = overduePaymentsData.length;
    
    // Get pending payments (future due date and unpaid)
    const pendingPaymentsData = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.isPaid, false),
          gte(payments.dueDate, formattedToday)
        )
      );
    const pendingPayments = pendingPaymentsData.length;
    
    return {
      expiredContracts,
      expiringContracts,
      totalContracts,
      pendingPayments,
      overduePayments
    };
  }
  
  // CONTRACT TEMPLATE METHODS
  async getContractTemplates(): Promise<ContractTemplate[]> {
    return await db
      .select()
      .from(contractTemplates)
      .where(eq(contractTemplates.isActive, true))
      .orderBy(contractTemplates.name);
  }

  async getContractTemplate(id: number): Promise<ContractTemplate | undefined> {
    const [template] = await db
      .select()
      .from(contractTemplates)
      .where(eq(contractTemplates.id, id));
    return template || undefined;
  }

  async createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate> {
    const [newTemplate] = await db
      .insert(contractTemplates)
      .values({
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      })
      .returning();
    return newTemplate;
  }

  async updateContractTemplate(id: number, template: Partial<InsertContractTemplate>): Promise<ContractTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(contractTemplates)
      .set({
        ...template,
        updatedAt: new Date()
      })
      .where(eq(contractTemplates.id, id))
      .returning();
    return updatedTemplate || undefined;
  }

  async deleteContractTemplate(id: number): Promise<boolean> {
    // Soft delete - marca como inativo
    const result = await db
      .update(contractTemplates)
      .set({ isActive: false })
      .where(eq(contractTemplates.id, id));
    return result.rowCount! > 0;
  }
  
  // Implementação do método getContractRenewalByNewContract
  async getContractRenewalByNewContract(newContractId: number): Promise<ContractRenewal | undefined> {
    const [renewal] = await db
      .select()
      .from(contractRenewals)
      .where(eq(contractRenewals.contractId, newContractId));
    return renewal || undefined;
  }
}

export const storage = new DatabaseStorage();
