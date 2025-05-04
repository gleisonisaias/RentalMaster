import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertOwnerSchema, 
  insertTenantSchema, 
  insertPropertySchema, 
  insertContractSchema, 
  insertPaymentSchema,
  insertContractTemplateSchema,
  ownerValidationSchema,
  tenantValidationSchema,
  propertyValidationSchema,
  contractValidationSchema,
  contractTemplateValidationSchema
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  generateResidentialContractPDF,
  generateCommercialContractPDF,
  generatePaymentReceiptPDF,
  generateContractRenewalPDF,
  addContractRenewalClauses
} from "./pdf-service";
import {
  generateResidentialContractHTML,
  generateCommercialContractHTML
} from "./html-output-service";
import { generatePaymentSlipsPDF } from "./payment-slips";
import { setupAuth } from "./auth";
import { convertAllNamesToUppercase } from "./convert-names-to-uppercase";
import { 
  uploadTenantDocument, 
  getTenantDocuments, 
  downloadTenantDocument, 
  deleteTenantDocument 
} from "./document-service";
import { generateTenantRegistrationForm } from "./tenant-registration-form-service";
import fs from "fs";
import path from "path";
import os from "os";
import PDFDocument from "pdfkit";

// Função auxiliar para obter uma data válida com o dia de pagamento correto
// Ajustada para o fuso horário de Brasília (GMT-3)
function getValidDueDate(firstPaymentDate: Date, monthsToAdd: number): Date {
  // Clonar a data base para não modificá-la
  const date = new Date(firstPaymentDate);
  
  // Sempre ajustar para o horário 15:00 de Brasília para evitar problemas de fuso horário
  date.setHours(15, 0, 0, 0);
  
  // Para a primeira parcela (monthsToAdd = 0), retornar a data original
  if (monthsToAdd === 0) {
    return date;
  }
  
  // Pegar o dia do mês da primeira data de pagamento
  const desiredDay = date.getDate();
  
  // Adicionar meses à data
  date.setMonth(date.getMonth() + monthsToAdd);
  
  // Verificar se o dia existe no mês atual
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  
  // Se o dia desejado for maior que o último dia do mês, usar o último dia
  if (desiredDay > lastDayOfMonth) {
    date.setDate(lastDayOfMonth);
  }
  
  return date;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configura autenticação
  setupAuth(app);
  // Dashboard Statistics
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter estatísticas do dashboard" });
    }
  });

  // Owner Routes
  app.get("/api/owners", async (req, res) => {
    try {
      const showInactive = req.query.showInactive === 'true';
      const owners = await storage.getOwners(showInactive);
      res.json(owners);
    } catch (error) {
      console.error("Erro ao buscar proprietários:", error);
      res.status(500).json({ message: "Erro ao obter proprietários" });
    }
  });
  
  // Rota para ativar/desativar proprietário
  app.patch("/api/owners/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "O campo isActive deve ser um booleano" });
      }
      
      const owner = await storage.updateOwner(id, { isActive });
      if (!owner) {
        return res.status(404).json({ message: "Proprietário não encontrado" });
      }
      
      res.json(owner);
    } catch (error) {
      console.error("Erro ao atualizar status do proprietário:", error);
      res.status(500).json({ message: "Erro ao atualizar status do proprietário" });
    }
  });

  app.get("/api/owners/:id", async (req, res) => {
    try {
      const owner = await storage.getOwner(Number(req.params.id));
      if (!owner) {
        return res.status(404).json({ message: "Proprietário não encontrado" });
      }
      res.json(owner);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter proprietário" });
    }
  });

  app.post("/api/owners", async (req, res) => {
    try {
      const data = await ownerValidationSchema.parseAsync(req.body);
      
      // Verifica se já existe proprietário com o mesmo CPF
      const existingOwner = await storage.findOwnerByDocument(data.document);
      if (existingOwner) {
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: [{ message: "CPF já cadastrado em outro proprietário" }]
        });
      }
      
      const owner = await storage.createOwner(data);
      res.status(201).json(owner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: validationError.details
        });
      }
      console.error("Erro ao criar proprietário:", error);
      res.status(500).json({ message: "Erro ao criar proprietário" });
    }
  });

  app.patch("/api/owners/:id", async (req, res) => {
    try {
      // Partial validation for update
      const data = await insertOwnerSchema.partial().parseAsync(req.body);
      const owner = await storage.updateOwner(Number(req.params.id), data);
      if (!owner) {
        return res.status(404).json({ message: "Proprietário não encontrado" });
      }
      res.json(owner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: validationError.details
        });
      }
      res.status(500).json({ message: "Erro ao atualizar proprietário" });
    }
  });

  app.delete("/api/owners/:id", async (req, res) => {
    try {
      const success = await storage.deleteOwner(Number(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Proprietário não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar proprietário" });
    }
  });

  // Tenant Routes
  app.get("/api/tenants", async (req, res) => {
    try {
      const showInactive = req.query.showInactive === 'true';
      const tenants = await storage.getTenants(showInactive);
      res.json(tenants);
    } catch (error) {
      console.error("Erro ao buscar inquilinos:", error);
      res.status(500).json({ message: "Erro ao obter inquilinos" });
    }
  });
  
  // Rota para ativar/desativar inquilino
  app.patch("/api/tenants/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "O campo isActive deve ser um booleano" });
      }
      
      const tenant = await storage.updateTenant(id, { isActive });
      if (!tenant) {
        return res.status(404).json({ message: "Inquilino não encontrado" });
      }
      
      res.json(tenant);
    } catch (error) {
      console.error("Erro ao atualizar status do inquilino:", error);
      res.status(500).json({ message: "Erro ao atualizar status do inquilino" });
    }
  });

  app.get("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.getTenant(Number(req.params.id));
      if (!tenant) {
        return res.status(404).json({ message: "Inquilino não encontrado" });
      }
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter inquilino" });
    }
  });

  app.post("/api/tenants", async (req, res) => {
    try {
      console.log("Recebida requisição para criar inquilino:", JSON.stringify(req.body, null, 2));
      
      if (!req.body) {
        console.error("Corpo da requisição vazio");
        return res.status(400).json({ 
          message: "Dados do inquilino não fornecidos", 
          errors: [{ message: "Corpo da requisição vazio" }]
        });
      }
      
      try {
        const data = await tenantValidationSchema.parseAsync(req.body);
        console.log("Dados validados com sucesso pelo Zod:", JSON.stringify(data, null, 2));
        
        // Verifica se já existe inquilino com o mesmo CPF
        const existingTenant = await storage.findTenantByDocument(data.document);
        if (existingTenant) {
          console.log("CPF já cadastrado:", data.document);
          return res.status(400).json({ 
            message: "Erro de validação", 
            errors: [{ message: "CPF já cadastrado em outro inquilino" }]
          });
        }
        
        console.log("Iniciando criação do inquilino no storage");
        const tenant = await storage.createTenant(data);
        console.log("Inquilino criado com sucesso, ID:", tenant.id);
        res.status(201).json(tenant);
      } catch (zodError) {
        if (zodError instanceof z.ZodError) {
          const validationError = fromZodError(zodError);
          console.error("Erro de validação Zod:", JSON.stringify(validationError, null, 2));
          return res.status(400).json({ 
            message: "Erro de validação", 
            errors: validationError.details
          });
        }
        throw zodError;
      }
    } catch (error) {
      console.error("Erro ao criar inquilino:", error);
      res.status(500).json({ message: "Erro ao criar inquilino" });
    }
  });

  app.patch("/api/tenants/:id", async (req, res) => {
    try {
      const data = await insertTenantSchema.partial().parseAsync(req.body);
      const tenant = await storage.updateTenant(Number(req.params.id), data);
      if (!tenant) {
        return res.status(404).json({ message: "Inquilino não encontrado" });
      }
      res.json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: validationError.details
        });
      }
      res.status(500).json({ message: "Erro ao atualizar inquilino" });
    }
  });

  app.delete("/api/tenants/:id", async (req, res) => {
    try {
      const success = await storage.deleteTenant(Number(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Inquilino não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar inquilino" });
    }
  });
  
  // Tenant Documents Routes
  app.post("/api/tenants/:tenantId/documents", uploadTenantDocument);
  app.get("/api/tenants/:tenantId/documents", getTenantDocuments);
  app.get("/api/documents/:documentId/download", downloadTenantDocument);
  app.delete("/api/documents/:documentId", deleteTenantDocument);
  
  // Tenant Registration Form
  app.get("/api/tenants/:id/registration-form", generateTenantRegistrationForm);
  
  // Ficha Cadastral em branco
  app.get("/api/tenant-registration-form/blank", (req, res) => {
    try {
      // Criar um inquilino fictício vazio
      const blankTenant = {
        id: 0,
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
          state: ""
        },
        guarantor: {
          name: "",
          document: "",
          rg: "",
          nationality: "",
          profession: "",
          maritalStatus: "",
          phone: "",
          email: "",
          spouseName: ""
        },
        isActive: true,
        createdAt: null
      };
      
      // Usar o mesmo serviço mas com tenant em branco
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        },
        info: {
          Title: "Ficha Cadastral - Em Branco",
          Author: 'Sistema de Gestão Imobiliária',
        }
      });
      
      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ficha-cadastral-em-branco.pdf`);
      
      // Pipe do PDF para a resposta
      doc.pipe(res);
      
      // Funções auxiliares para desenhar o documento
      const drawCenteredText = (text: string, y: number, options?: any) => {
        // @ts-ignore - pdfkit tipos não refletem corretamente a API
        const textWidth = doc.widthOfString(text, options);
        // @ts-ignore
        const pageWidth = doc.page.width - 100; // Considerando margens
        const x = (pageWidth - textWidth) / 2 + 50; // +50 para considerar a margem esquerda
        doc.text(text, x, y, options);
      };
      
      const drawField = (label: string, x: number, y: number, width: number) => {
        // @ts-ignore - pdfkit tipos não refletem corretamente a API
        doc.fontSize(9).text(label, x, y);
        
        // Desenhar um retângulo para o campo de valor (em branco)
        // @ts-ignore
        doc.rect(x, y + 15, width, 25).stroke();
        
        return y + 45; // Retorna a próxima posição Y (com espaçamento)
      };
      
      // Desenhar cabeçalho
      doc.font('Helvetica-Bold').fontSize(16);
      drawCenteredText('FICHA CADASTRAL DO INQUILINO', 50);
      
      doc.fontSize(12).moveDown(1);
      
      // Seção de dados do inquilino
      doc.font('Helvetica-Bold').fontSize(14);
      doc.text('Dados do Inquilino', 50, 90);
      // @ts-ignore
      doc.moveTo(50, 110).lineTo(545, 110).stroke();
      
      let y = 120;
      
      // Nome completo (campo maior)
      y = drawField('Nome completo', 50, y, 495);
      
      // CPF e RG
      const nextY = drawField('CPF', 50, y, 240);
      y = drawField('RG', 310, y, 235);
      y = Math.max(y, nextY);
      
      // Telefone e E-mail
      const nextY2 = drawField('Telefone', 50, y, 240);
      y = drawField('E-mail', 310, y, 235);
      y = Math.max(y, nextY2);
      
      // Nacionalidade e Profissão
      const nextY3 = drawField('Nacionalidade', 50, y, 240);
      y = drawField('Profissão', 310, y, 235);
      y = Math.max(y, nextY3);
      
      // Estado Civil e Nome do Cônjuge
      const nextY4 = drawField('Estado Civil', 50, y, 240);
      y = drawField('Nome do Cônjuge', 310, y, 235);
      y = Math.max(y, nextY4);
      
      // Informações de Endereço
      doc.addPage();
      
      doc.font('Helvetica-Bold').fontSize(14);
      doc.text('Endereço do Inquilino', 50, 50);
      // @ts-ignore
      doc.moveTo(50, 70).lineTo(545, 70).stroke();
      
      y = 80;
      
      // CEP e Rua
      const nextY5 = drawField('CEP', 50, y, 240);
      y = drawField('Rua', 310, y, 235);
      y = Math.max(y, nextY5);
      
      // Número e Complemento
      const nextY6 = drawField('Número', 50, y, 240);
      y = drawField('Complemento', 310, y, 235);
      y = Math.max(y, nextY6);
      
      // Bairro e Cidade
      const nextY7 = drawField('Bairro', 50, y, 240);
      y = drawField('Cidade', 310, y, 235);
      y = Math.max(y, nextY7);
      
      // Estado
      y = drawField('Estado', 50, y, 240);
      
      // Seção do Fiador
      y += 20;
      doc.font('Helvetica-Bold').fontSize(14);
      doc.text('Dados do Fiador', 50, y);
      y += 20;
      // @ts-ignore
      doc.moveTo(50, y).lineTo(545, y).stroke();
      y += 10;
      
      // Nome completo (campo maior)
      y = drawField('Nome completo', 50, y, 495);
      
      // CPF e RG
      const nextY8 = drawField('CPF', 50, y, 240);
      y = drawField('RG', 310, y, 235);
      y = Math.max(y, nextY8);
      
      // Telefone e E-mail
      const nextY9 = drawField('Telefone', 50, y, 240);
      y = drawField('E-mail', 310, y, 235);
      y = Math.max(y, nextY9);
      
      // Nacionalidade e Profissão
      const nextY10 = drawField('Nacionalidade', 50, y, 240);
      y = drawField('Profissão', 310, y, 235);
      y = Math.max(y, nextY10);
      
      // Estado Civil e Nome do Cônjuge
      const nextY11 = drawField('Estado Civil', 50, y, 240);
      y = drawField('Nome do Cônjuge', 310, y, 235);
      y = Math.max(y, nextY11);
      
      // Finalizar o documento
      doc.end();
    } catch (error) {
      console.error("Erro ao gerar ficha cadastral em branco:", error);
      res.status(500).json({ error: "Erro ao gerar ficha cadastral em branco" });
    }
  });

  // Property Routes
  app.get("/api/properties", async (req, res) => {
    try {
      // Converter o parâmetro de string para booleano
      const showInactive = req.query.showInactive === 'true';
      const properties = await storage.getProperties(showInactive);
      res.json(properties);
    } catch (error) {
      console.error("Erro ao buscar imóveis:", error);
      res.status(500).json({ message: "Erro ao obter imóveis" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(Number(req.params.id));
      if (!property) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter imóvel" });
    }
  });

  app.get("/api/properties/owner/:ownerId", async (req, res) => {
    try {
      const properties = await storage.getPropertiesByOwner(Number(req.params.ownerId));
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter imóveis do proprietário" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const data = await propertyValidationSchema.parseAsync(req.body);
      const property = await storage.createProperty(data);
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: validationError.details
        });
      }
      res.status(500).json({ message: "Erro ao criar imóvel" });
    }
  });

  app.patch("/api/properties/:id", async (req, res) => {
    try {
      console.log("Recebendo solicitação de atualização de imóvel:", req.params.id);
      console.log("Dados recebidos:", req.body);
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const data = await insertPropertySchema.partial().parseAsync(req.body);
      console.log("Dados validados:", data);
      
      const property = await storage.updateProperty(Number(req.params.id), data);
      if (!property) {
        console.log("Imóvel não encontrado");
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      
      console.log("Imóvel atualizado com sucesso:", property);
      res.json(property);
    } catch (error) {
      console.error("Erro ao atualizar imóvel:", error);
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: validationError.details
        });
      }
      res.status(500).json({ message: "Erro ao atualizar imóvel" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const success = await storage.deleteProperty(Number(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar imóvel" });
    }
  });
  
  // Rotas para ativar/desativar imóveis
  app.post("/api/properties/:id/activate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = Number(req.params.id);
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      
      // Ativa o imóvel
      const updatedProperty = await storage.updateProperty(id, { isActive: true });
      res.json(updatedProperty);
    } catch (error) {
      console.error("Erro ao ativar imóvel:", error);
      res.status(500).json({ message: "Erro ao ativar imóvel" });
    }
  });
  
  app.post("/api/properties/:id/deactivate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = Number(req.params.id);
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      
      // Desativa o imóvel
      const updatedProperty = await storage.updateProperty(id, { isActive: false });
      res.json(updatedProperty);
    } catch (error) {
      console.error("Erro ao desativar imóvel:", error);
      res.status(500).json({ message: "Erro ao desativar imóvel" });
    }
  });

  // Contract Routes
  app.get("/api/contracts", async (_req, res) => {
    try {
      const contracts = await storage.getContracts();
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter contratos" });
    }
  });

  app.get("/api/contracts/:id", async (req, res) => {
    try {
      const contract = await storage.getContract(Number(req.params.id));
      if (!contract) {
        return res.status(404).json({ message: "Contrato não encontrado" });
      }
      res.json(contract);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter contrato" });
    }
  });

  app.get("/api/contracts/owner/:ownerId", async (req, res) => {
    try {
      const contracts = await storage.getContractsByOwner(Number(req.params.ownerId));
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter contratos do proprietário" });
    }
  });

  app.get("/api/contracts/tenant/:tenantId", async (req, res) => {
    try {
      const contracts = await storage.getContractsByTenant(Number(req.params.tenantId));
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter contratos do inquilino" });
    }
  });

  app.get("/api/contracts/property/:propertyId", async (req, res) => {
    try {
      const contracts = await storage.getContractsByProperty(Number(req.params.propertyId));
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter contratos do imóvel" });
    }
  });

  app.post("/api/contracts", async (req, res) => {
    try {
      const data = await contractValidationSchema.parseAsync(req.body);
      const contract = await storage.createContract(data);
      
      // Gerar as parcelas automaticamente com base na duração do contrato
      // Usar a data do primeiro pagamento como base para os demais pagamentos
      const firstPaymentDate = new Date(contract.firstPaymentDate);
      // Ajustar para o horário 15:00 (GMT-3 - Brasília) para evitar problemas de fuso horário
      firstPaymentDate.setHours(15, 0, 0, 0);
      
      console.log(`Gerando ${contract.duration} parcelas para o contrato #${contract.id}`);
      
      // Criando um array de promessas para a inserção de todas as parcelas
      const paymentPromises = [];
      
      for (let i = 0; i < contract.duration; i++) {
        // Calculando a data de vencimento para cada parcela usando a função auxiliar
        const dueDate = getValidDueDate(firstPaymentDate, i);
        
        // Formatando a data para string YYYY-MM-DD
        // Garantindo que a data está no formato correto e ajustada ao fuso horário
        const dateCopy = new Date(dueDate);
        dateCopy.setHours(15, 0, 0, 0); // Padronizar como 15:00 GMT-3
        const formattedDueDate = dateCopy.toISOString().split('T')[0];
        
        const payment = {
          contractId: contract.id,
          dueDate: formattedDueDate,
          value: contract.rentValue,
          isPaid: false,
          paymentDate: null,
          interestAmount: 0,
          latePaymentFee: 0,
          paymentMethod: null,
          receiptNumber: null,
          observations: `Parcela ${i+1}/${contract.duration}`,
          installmentNumber: i+1 // Número da parcela, começando de 1
        };
        
        // Adiciona a promessa de criação do pagamento
        paymentPromises.push(storage.createPayment(payment));
      }
      
      // Espera todas as promessas serem resolvidas
      await Promise.all(paymentPromises);
      console.log(`${contract.duration} parcelas geradas com sucesso para o contrato #${contract.id}`);
      
      res.status(201).json(contract);
    } catch (error) {
      console.error("Erro ao criar contrato ou gerar parcelas:", error);
      
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: validationError.details
        });
      }
      res.status(500).json({ message: "Erro ao criar contrato ou gerar parcelas" });
    }
  });

  app.patch("/api/contracts/:id", async (req, res) => {
    try {
      const data = await insertContractSchema.partial().parseAsync(req.body);
      const contract = await storage.updateContract(Number(req.params.id), data);
      if (!contract) {
        return res.status(404).json({ message: "Contrato não encontrado" });
      }
      res.json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: validationError.details
        });
      }
      res.status(500).json({ message: "Erro ao atualizar contrato" });
    }
  });

  app.delete("/api/contracts/:id", async (req, res) => {
    try {
      const result = await storage.deleteContract(Number(req.params.id));
      
      if (!result.success) {
        // Se existem parcelas pagas, retornar status 400 com detalhes
        if (result.hasPaidPayments) {
          return res.status(400).json({ 
            message: "Não é possível excluir o contrato porque existem parcelas pagas",
            hasPaidPayments: true,
            paidPaymentIds: result.paidPaymentIds
          });
        }
        // Se o contrato não foi encontrado ou outro erro ocorreu
        return res.status(404).json({ message: "Contrato não encontrado" });
      }
      
      // Sucesso - contrato e todas as parcelas foram excluídos
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar contrato:", error);
      res.status(500).json({ message: "Erro ao deletar contrato" });
    }
  });

  // Rotas para renovações de contrato
  app.get("/api/contract-renewals", async (_req, res) => {
    try {
      const renewals = await storage.getContractRenewals();
      res.json(renewals);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter renovações de contrato" });
    }
  });
  
  app.get("/api/contract-renewals/:id", async (req, res) => {
    try {
      const renewal = await storage.getContractRenewal(Number(req.params.id));
      if (!renewal) {
        return res.status(404).json({ message: "Renovação de contrato não encontrada" });
      }
      res.json(renewal);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter renovação de contrato" });
    }
  });
  
  app.get("/api/contract-renewals/contract/:contractId", async (req, res) => {
    try {
      const renewals = await storage.getContractRenewalsByContract(Number(req.params.contractId));
      res.json(renewals);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter renovações do contrato" });
    }
  });
  
  app.get("/api/contract-renewals/original/:originalContractId", async (req, res) => {
    try {
      const renewals = await storage.getContractRenewalsByOriginalContract(Number(req.params.originalContractId));
      res.json(renewals);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter renovações do contrato original" });
    }
  });
  
  // Função auxiliar para calcular a duração em meses entre duas datas
  // Ajustada para o fuso horário de Brasília (GMT-3)
  function calculateDurationInMonths(startDateStr: string, endDateStr: string): number {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Ajustar para o horário 15:00 de Brasília para evitar problemas de fuso horário
    startDate.setHours(15, 0, 0, 0);
    endDate.setHours(15, 0, 0, 0);
    
    return (
      (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
      endDate.getMonth() - startDate.getMonth()
    );
  }
  
  app.post("/api/contract-renewals", async (req, res) => {
    try {
      // Obter o contrato original
      const originalContract = await storage.getContract(req.body.originalContractId);
      
      if (!originalContract) {
        return res.status(404).json({ message: "Contrato original não encontrado" });
      }
      
      // Criar um novo contrato (renovado) com base no original
      const newContract = {
        ownerId: originalContract.ownerId,
        tenantId: originalContract.tenantId,
        propertyId: originalContract.propertyId,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        duration: calculateDurationInMonths(req.body.startDate, req.body.endDate),
        rentValue: req.body.newRentValue,
        firstPaymentDate: req.body.firstPaymentDate || req.body.startDate, // Usar data fornecida ou data de início como default
        status: 'ativo',
        observations: `Renovação do contrato #${originalContract.id}. ${req.body.observations || ''}`,
        isRenewal: true,
        originalContractId: originalContract.id
      };
      
      // Criar o novo contrato
      const createdContract = await storage.createContract(newContract);
      
      // Atualizar o contrato original para status 'renovado'
      await storage.updateContract(originalContract.id, { status: 'renovado' });
      
      // Criar renovação de contrato (com o contractId já definido)
      const renewalData = {
        ...req.body,
        contractId: createdContract.id // Adicionar o ID do contrato criado
      };
      
      const renewal = await storage.createContractRenewal(renewalData);
      
      // Gerar as parcelas automaticamente para o novo contrato
      console.log(`Gerando ${createdContract.duration} parcelas para o contrato renovado #${createdContract.id}`);
      
      // Usar a data do primeiro pagamento como base para os demais pagamentos
      const firstPaymentDate = new Date(createdContract.firstPaymentDate);
      // Ajustar para o horário 15:00 (GMT-3 - Brasília) para evitar problemas de fuso horário
      firstPaymentDate.setHours(15, 0, 0, 0);
      
      // Criando um array de promessas para a inserção de todas as parcelas
      const paymentPromises = [];
      
      // Reutilizar a função auxiliar getValidDueDate definida anteriormente
      for (let i = 0; i < createdContract.duration; i++) {
        // Calculando a data de vencimento para cada parcela usando a função auxiliar
        const dueDate = getValidDueDate(firstPaymentDate, i);
        
        // Formatando a data para string YYYY-MM-DD
        // Garantindo que a data está no formato correto e ajustada ao fuso horário
        const dateCopy = new Date(dueDate);
        dateCopy.setHours(15, 0, 0, 0); // Padronizar como 15:00 GMT-3
        const formattedDueDate = dateCopy.toISOString().split('T')[0];
        
        const payment = {
          contractId: createdContract.id,
          dueDate: formattedDueDate,
          value: createdContract.rentValue,
          isPaid: false,
          paymentDate: null,
          interestAmount: 0,
          latePaymentFee: 0,
          paymentMethod: null,
          receiptNumber: null,
          observations: `Parcela ${i+1}/${createdContract.duration} (Contrato Renovado)`,
          installmentNumber: i+1 // Número da parcela, começando de 1
        };
        
        // Adicionando à lista de promessas
        paymentPromises.push(storage.createPayment(payment));
      }
      
      // Aguardando todas as inserções de parcelas
      await Promise.all(paymentPromises);
      console.log(`${paymentPromises.length} parcelas geradas com sucesso para o contrato renovado #${createdContract.id}`);
      
      // Retornar a renovação atualizada e o novo contrato
      res.status(201).json({ 
        renewal: await storage.getContractRenewal(renewal.id),
        contract: createdContract 
      });
    } catch (error) {
      console.error("Erro ao criar renovação de contrato:", error);
      res.status(500).json({ message: "Erro ao criar renovação de contrato" });
    }
  });
  
  app.put("/api/contract-renewals/:id", async (req, res) => {
    try {
      const renewal = await storage.updateContractRenewal(Number(req.params.id), req.body);
      if (!renewal) {
        return res.status(404).json({ message: "Renovação de contrato não encontrada" });
      }
      res.json(renewal);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar renovação de contrato" });
    }
  });
  
  app.delete("/api/contract-renewals/:id", async (req, res) => {
    try {
      const success = await storage.deleteContractRenewal(Number(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Renovação de contrato não encontrada" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir renovação de contrato" });
    }
  });
  
  // Payment Routes
  app.get("/api/payments", async (_req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter pagamentos" });
    }
  });

  app.get("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.getPayment(Number(req.params.id));
      if (!payment) {
        return res.status(404).json({ message: "Pagamento não encontrado" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter pagamento" });
    }
  });
  
  // Nova rota para obter todos os dados necessários para o recibo em uma única chamada
  app.get("/api/payments/:id/receipt-data", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: "Pagamento não encontrado" });
      }
      
      // Obter contrato
      const contract = await storage.getContract(payment.contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contrato não encontrado" });
      }
      
      // Obter proprietário
      const owner = await storage.getOwner(contract.ownerId);
      if (!owner) {
        return res.status(404).json({ message: "Proprietário não encontrado" });
      }
      
      // Obter inquilino
      const tenant = await storage.getTenant(contract.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Inquilino não encontrado" });
      }
      
      // Obter imóvel
      const property = await storage.getProperty(contract.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      
      // Retornar todos os dados necessários em um único objeto
      res.json({
        payment,
        contract,
        owner,
        tenant,
        property
      });
    } catch (error) {
      console.error("Erro ao buscar dados para recibo:", error);
      res.status(500).json({ message: "Erro ao obter dados para recibo" });
    }
  });

  app.get("/api/payments/contract/:contractId", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByContract(Number(req.params.contractId));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Erro ao obter pagamentos do contrato" });
    }
  });
  
  // Rota para obter dados necessários para gerar carnês
  app.get("/api/contracts/:id/payment-slips-data", async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const contract = await storage.getContract(contractId);
      
      if (!contract) {
        return res.status(404).json({ message: "Contrato não encontrado" });
      }
      
      // Obter dados relacionados em paralelo
      const [owner, tenant, property, payments] = await Promise.all([
        storage.getOwner(contract.ownerId),
        storage.getTenant(contract.tenantId),
        storage.getProperty(contract.propertyId),
        storage.getPaymentsByContract(contractId)
      ]);
      
      if (!owner || !tenant || !property) {
        return res.status(404).json({ message: "Dados relacionados não encontrados" });
      }
      
      // Filtrar pagamentos pendentes
      const pendingPayments = payments.filter(payment => !payment.isPaid);
      
      // Retornar todos os dados necessários
      res.json({
        contract,
        owner,
        tenant,
        property,
        payments: pendingPayments
      });
    } catch (error) {
      console.error("Erro ao buscar dados para carnês:", error);
      res.status(500).json({ message: "Erro ao obter dados para carnês" });
    }
  });
  
  // Rota para gerar PDF de carnês de pagamento
  app.get("/api/contracts/:id/payment-slips", generatePaymentSlipsPDF);

  app.post("/api/payments", async (req, res) => {
    try {
      const data = await insertPaymentSchema.parseAsync(req.body);
      const payment = await storage.createPayment(data);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: validationError.details
        });
      }
      res.status(500).json({ message: "Erro ao criar pagamento" });
    }
  });

  app.patch("/api/payments/:id", async (req, res) => {
    try {
      const data = await insertPaymentSchema.partial().parseAsync(req.body);
      const payment = await storage.updatePayment(Number(req.params.id), data);
      if (!payment) {
        return res.status(404).json({ message: "Pagamento não encontrado" });
      }
      res.json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: validationError.details
        });
      }
      res.status(500).json({ message: "Erro ao atualizar pagamento" });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Verifica se o usuário é administrador ou enviou a senha de admin
      const { adminPassword } = req.body;
      
      if (req.user.role !== 'admin') {
        // Se não for admin, verifica se enviou a senha de algum admin
        if (!adminPassword) {
          return res.status(403).json({ 
            message: "É necessário fornecer a senha de administrador para esta operação.",
            requireAdminPassword: true
          });
        }
        
        // Busca todos os administradores
        const users = await storage.getUsers();
        const adminUsers = users.filter(user => user.role === 'admin' && user.isActive);
        
        // Verifica se alguma senha de admin corresponde
        const { comparePasswords } = require('./auth');
        let adminAuthValid = false;
        
        for (const admin of adminUsers) {
          if (await comparePasswords(adminPassword, admin.password)) {
            adminAuthValid = true;
            break;
          }
        }
        
        if (!adminAuthValid) {
          return res.status(403).json({ 
            message: "Senha de administrador inválida.",
            requireAdminPassword: true
          });
        }
      }
      
      const success = await storage.deletePayment(Number(req.params.id), req.user.id);
      if (!success) {
        return res.status(404).json({ message: "Pagamento não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir pagamento:", error);
      res.status(500).json({ message: "Erro ao deletar pagamento" });
    }
  });
  
  // Rotas para histórico de pagamentos excluídos
  app.get("/api/deleted-payments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const deletedPayments = await storage.getDeletedPayments();
      res.json(deletedPayments);
    } catch (error) {
      console.error("Erro ao consultar pagamentos excluídos:", error);
      res.status(500).json({ message: "Erro ao consultar pagamentos excluídos" });
    }
  });
  
  app.get("/api/deleted-payments/contract/:contractId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const deletedPayments = await storage.getDeletedPaymentsByContract(Number(req.params.contractId));
      res.json(deletedPayments);
    } catch (error) {
      console.error("Erro ao consultar pagamentos excluídos do contrato:", error);
      res.status(500).json({ message: "Erro ao consultar pagamentos excluídos do contrato" });
    }
  });
  
  app.get("/api/deleted-payments/user/:userId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const deletedPayments = await storage.getDeletedPaymentsByUser(Number(req.params.userId));
      res.json(deletedPayments);
    } catch (error) {
      console.error("Erro ao consultar pagamentos excluídos pelo usuário:", error);
      res.status(500).json({ message: "Erro ao consultar pagamentos excluídos pelo usuário" });
    }
  });
  
  // Rota para restaurar um pagamento excluído
  app.post("/api/deleted-payments/restore/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Verifica se o usuário é administrador ou enviou a senha de admin
      const { adminPassword } = req.body;
      
      if (req.user.role !== 'admin') {
        // Se não for admin, verifica se enviou a senha de algum admin
        if (!adminPassword) {
          return res.status(403).json({ 
            message: "É necessário fornecer a senha de administrador para esta operação.",
            requireAdminPassword: true
          });
        }
        
        // Busca todos os administradores
        const users = await storage.getUsers();
        const adminUsers = users.filter(user => user.role === 'admin' && user.isActive);
        
        // Verifica se alguma senha de admin corresponde
        const { comparePasswords } = require('./auth');
        let adminAuthValid = false;
        
        for (const admin of adminUsers) {
          if (await comparePasswords(adminPassword, admin.password)) {
            adminAuthValid = true;
            break;
          }
        }
        
        if (!adminAuthValid) {
          return res.status(403).json({ 
            message: "Senha de administrador inválida.",
            requireAdminPassword: true
          });
        }
      }
      
      const payment = await storage.restoreDeletedPayment(Number(req.params.id));
      
      if (!payment) {
        return res.status(404).json({ message: "Pagamento não encontrado" });
      }
      
      res.status(200).json(payment);
    } catch (error) {
      console.error("Erro ao restaurar pagamento:", error);
      res.status(500).json({ message: "Erro ao restaurar pagamento excluído" });
    }
  });

  // API para listar usuários (usado para exibir nomes nas páginas do sistema)
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });
  
  // Rota para limpar todos os dados do sistema (exceto usuário administrador)
  app.post("/api/admin/reset-system", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.log("Tentativa de reset sem autenticação", req.session);
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Verifica se o usuário atual é um administrador
      if (!req.user || req.user.role !== 'admin') {
        console.log("Tentativa de reset por usuário não administrador", req.user);
        return res.status(403).json({ message: "Apenas administradores podem realizar esta operação" });
      }
      
      console.log("Iniciando reset do sistema pelo admin ID:", req.user.id);
      
      // Limpar todos os dados mantendo apenas o usuário administrador atual
      await storage.resetSystem(req.user.id);
      
      console.log("Reset do sistema concluído com sucesso");
      res.status(200).json({ message: "Sistema resetado com sucesso" });
    } catch (error) {
      console.error("Erro ao resetar sistema:", error);
      res.status(500).json({ message: "Erro ao resetar sistema" });
    }
  });

  // Rota para backup do sistema
  app.get("/api/admin/backup", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Verifica se o usuário atual é um administrador
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Apenas administradores podem realizar esta operação" });
      }
      
      console.log("Iniciando backup do sistema pelo admin ID:", req.user.id);
      
      // Obter dados de backup
      const backupData = await storage.backupData();
      
      // Configurar headers para download do arquivo
      // Criar data ajustada para o fuso horário de Brasília (GMT-3)
      const currentDate = new Date();
      currentDate.setHours(15, 0, 0, 0); // Padronizar como 15:00 GMT-3
      const fileName = `backup-sistema-${currentDate.toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-Type', 'application/json');
      
      // Enviar dados do backup
      res.status(200).json(backupData);
    } catch (error) {
      console.error("Erro ao criar backup:", error);
      res.status(500).json({ message: "Erro ao criar backup", error: String(error) });
    }
  });
  
  // Rota para restauração de backup
  app.post("/api/admin/restore", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Verifica se o usuário atual é um administrador
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Apenas administradores podem realizar esta operação" });
      }
      
      const backupData = req.body;
      
      if (!backupData || typeof backupData !== 'object') {
        return res.status(400).json({ message: "Dados de backup inválidos" });
      }
      
      console.log("Iniciando restauração de backup pelo admin ID:", req.user.id);
      
      // Restaurar dados do backup
      await storage.restoreData(backupData, req.user.id);
      
      console.log("Restauração de backup concluída com sucesso");
      res.status(200).json({ message: "Backup restaurado com sucesso" });
    } catch (error) {
      console.error("Erro ao restaurar backup:", error);
      res.status(500).json({ message: "Erro ao restaurar backup", error: String(error) });
    }
  });

  // CEP Lookup API
  app.get("/api/cep/:cep", async (req, res) => {
    try {
      const cep = req.params.cep.replace(/\D/g, "");
      if (cep.length !== 8) {
        return res.status(400).json({ message: "CEP inválido" });
      }

      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        return res.status(404).json({ message: "CEP não encontrado" });
      }

      const addressData = {
        zipCode: data.cep,
        street: data.logradouro,
        complement: data.complemento,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf
      };

      res.json(addressData);
    } catch (error) {
      res.status(500).json({ message: "Erro ao consultar CEP" });
    }
  });

  // PDF Generation Routes
  app.get("/api/contracts/:id/pdf/residential", generateResidentialContractPDF);
  app.get("/api/contracts/:id/pdf/commercial", generateCommercialContractPDF);
  app.get("/api/payments/:id/pdf", generatePaymentReceiptPDF);
  
  // HTML Document Generation Routes (alternativa ao PDF para melhor formatação)
  app.get("/api/contracts/:id/html/residential", generateResidentialContractHTML);
  app.get("/api/contracts/:id/html/commercial", generateCommercialContractHTML);
  
  // Rotas para visualização prévia de contratos em HTML
  app.get("/api/contracts/:id/preview/residential", async (req, res) => {
    const { getProcessedTemplate, getProcessedTemplateByType } = await import('./contract-templates-service');
    try {
      const contractId = Number(req.params.id);
      const contract = await storage.getContract(contractId);
      
      if (!contract) {
        return res.status(404).json({ error: 'Contrato não encontrado' });
      }
      
      const [owner, tenant, property] = await Promise.all([
        storage.getOwner(contract.ownerId),
        storage.getTenant(contract.tenantId),
        storage.getProperty(contract.propertyId)
      ]);
      
      if (!owner || !tenant || !property) {
        return res.status(404).json({ error: 'Dados relacionados não encontrados' });
      }
      
      // Verificar se foi enviado um ID de template específico via query param
      let content;
      const templateId = req.query.templateId ? Number(req.query.templateId) : null;
      
      if (templateId) {
        // Usar template personalizado específico
        content = await getProcessedTemplate(templateId, { owner, tenant, property, contract });
      } else {
        // Usar template padrão do tipo residencial
        content = await getProcessedTemplateByType('residential', { owner, tenant, property, contract });
      }
      
      // Enviar o HTML processado diretamente
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Visualização de Contrato - ${owner.name} e ${tenant.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 30px;
              color: #333;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #ddd;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            h1, h2 {
              text-align: center;
            }
            .toolbar {
              display: flex;
              justify-content: space-between;
              position: sticky;
              top: 0;
              background: #f8f8f8;
              padding: 10px;
              border-bottom: 1px solid #ddd;
              margin-bottom: 20px;
            }
            .btn {
              padding: 8px 16px;
              cursor: pointer;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 4px;
            }
            .btn:hover {
              background-color: #45a049;
            }
            .pre-content {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button class="btn" onclick="window.print()">Imprimir</button>
            <button class="btn" onclick="window.location.href='/api/contracts/${contractId}/pdf/residential${templateId ? `?templateId=${templateId}` : ''}'">Baixar PDF</button>
            <button class="btn" onclick="window.history.back()">Voltar</button>
          </div>
          <div class="container">
            <h1>CONTRATO DE LOCAÇÃO RESIDENCIAL</h1>
            <div class="pre-content">
              ${content.replace(/\n/g, '<br>')}
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Erro ao gerar preview HTML do contrato:", error);
      res.status(500).json({ 
        error: 'Erro ao gerar preview do contrato', 
        message: error.message 
      });
    }
  });
  
  app.get("/api/contracts/:id/preview/commercial", async (req, res) => {
    const { getProcessedTemplate, getProcessedTemplateByType } = await import('./contract-templates-service');
    try {
      const contractId = Number(req.params.id);
      const contract = await storage.getContract(contractId);
      
      if (!contract) {
        return res.status(404).json({ error: 'Contrato não encontrado' });
      }
      
      const [owner, tenant, property] = await Promise.all([
        storage.getOwner(contract.ownerId),
        storage.getTenant(contract.tenantId),
        storage.getProperty(contract.propertyId)
      ]);
      
      if (!owner || !tenant || !property) {
        return res.status(404).json({ error: 'Dados relacionados não encontrados' });
      }
      
      // Verificar se foi enviado um ID de template específico via query param
      let content;
      const templateId = req.query.templateId ? Number(req.query.templateId) : null;
      
      if (templateId) {
        // Usar template personalizado específico
        content = await getProcessedTemplate(templateId, { owner, tenant, property, contract });
      } else {
        // Usar template padrão do tipo comercial
        content = await getProcessedTemplateByType('commercial', { owner, tenant, property, contract });
      }
      
      // Enviar o HTML processado diretamente
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Visualização de Contrato - ${owner.name} e ${tenant.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 30px;
              color: #333;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #ddd;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            h1, h2 {
              text-align: center;
            }
            .toolbar {
              display: flex;
              justify-content: space-between;
              position: sticky;
              top: 0;
              background: #f8f8f8;
              padding: 10px;
              border-bottom: 1px solid #ddd;
              margin-bottom: 20px;
            }
            .btn {
              padding: 8px 16px;
              cursor: pointer;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 4px;
            }
            .btn:hover {
              background-color: #45a049;
            }
            .pre-content {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button class="btn" onclick="window.print()">Imprimir</button>
            <button class="btn" onclick="window.location.href='/api/contracts/${contractId}/pdf/commercial${templateId ? `?templateId=${templateId}` : ''}'">Baixar PDF</button>
            <button class="btn" onclick="window.history.back()">Voltar</button>
          </div>
          <div class="container">
            <h1>CONTRATO DE LOCAÇÃO COMERCIAL</h1>
            <div class="pre-content">
              ${content.replace(/\n/g, '<br>')}
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Erro ao gerar preview HTML do contrato:", error);
      res.status(500).json({ 
        error: 'Erro ao gerar preview do contrato', 
        message: error.message 
      });
    }
  });
  
  // Rota para gerar PDF do termo aditivo pelo ID da renovação
  app.get("/api/contract-renewals/:id/pdf", generateContractRenewalPDF);
  
  // Rota para buscar renovação pelo ID do contrato renovado e gerar PDF
  app.get("/api/contract-renewals/by-contract/:contractId/pdf", async (req, res) => {
    try {
      const contractId = Number(req.params.contractId);
      const renewal = await storage.getContractRenewalByNewContractId(contractId);
      
      if (!renewal) {
        return res.status(404).json({ error: 'Renovação de contrato não encontrada para este contrato' });
      }
      
      // Primeiro buscar contratos para obter os IDs
      const [originalContract, newContract] = await Promise.all([
        storage.getContract(renewal.originalContractId),
        storage.getContract(renewal.contractId)
      ]);
      
      if (!originalContract || !newContract) {
        return res.status(404).json({ error: 'Contratos relacionados não encontrados' });
      }
      
      // Depois buscar proprietário, inquilino e imóvel diretamente pelos IDs
      const [owner, tenant, property] = await Promise.all([
        storage.getOwner(originalContract.ownerId),
        storage.getTenant(originalContract.tenantId),
        storage.getProperty(originalContract.propertyId)
      ]);
      
      if (!owner || !tenant || !property) {
        return res.status(404).json({ error: 'Dados relacionados não encontrados' });
      }
      
      // Criar um objeto renewalData completo para passar para a função
      const renewalData = {
        renewal,
        originalContract,
        newContract,
        owner,
        tenant,
        property
      };
      
      // Criar um arquivo temporário para o PDF
      const tempFilePath = path.join(os.tmpdir(), `termo_aditivo_${renewal.id}_${Date.now()}.pdf`);
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        },
        info: {
          Title: `Termo Aditivo de Renovação - ${owner.name} e ${tenant.name}`,
          Author: 'Sistema de Gestão de Contratos de Aluguel',
          Subject: 'Termo Aditivo de Renovação de Contrato',
          Keywords: 'aluguel, contrato, renovação, termo aditivo',
          // Usar horário padronizado com 15:00 GMT-3
          CreationDate: (() => {
            const date = new Date();
            date.setHours(15, 0, 0, 0);
            return date;
          })(),
        }
      }) as PDFDocumentWithMethods;
      
      // Criar um stream de escrita para o arquivo temporário
      const writeStream = fs.createWriteStream(tempFilePath);
      doc.pipe(writeStream);
      
      // Adicionar cláusulas do termo aditivo
      addContractRenewalClauses(doc, renewalData);
      
      // Finalizar o documento
      doc.end();
      
      // Quando o stream for fechado, enviar o arquivo para o cliente
      writeStream.on('finish', () => {
        // Definir headers para download do PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="termo_aditivo_${renewal.id}.pdf"`);
        
        // Ler o arquivo e enviar para o cliente
        const readStream = fs.createReadStream(tempFilePath);
        readStream.pipe(res);
        
        // Remover o arquivo temporário após o envio
        readStream.on('end', () => {
          fs.unlink(tempFilePath, (err) => {
            if (err) console.error('Erro ao remover arquivo temporário:', err);
          });
        });
      });
    } catch (error) {
      console.error("Erro ao gerar PDF do termo aditivo pelo ID do contrato:", error);
      return res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
  });

  // Novas rotas para ativar/desativar proprietários e inquilinos
  // Rotas para toggle de status via PATCH (manter para compatibilidade)
  app.patch("/api/owners/:id/toggle-status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = Number(req.params.id);
      const owner = await storage.getOwner(id);
      
      if (!owner) {
        return res.status(404).json({ message: "Proprietário não encontrado" });
      }
      
      // Inverte o status atual
      const updatedOwner = await storage.updateOwner(id, { isActive: !owner.isActive });
      res.json(updatedOwner);
    } catch (error) {
      console.error("Erro ao alterar status do proprietário:", error);
      res.status(500).json({ message: "Erro ao alterar status do proprietário" });
    }
  });

  // Rotas para ativar/desativar via POST (novas)
  app.post("/api/owners/:id/activate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = Number(req.params.id);
      const owner = await storage.getOwner(id);
      
      if (!owner) {
        return res.status(404).json({ message: "Proprietário não encontrado" });
      }
      
      // Ativa o proprietário
      const updatedOwner = await storage.updateOwner(id, { isActive: true });
      res.json(updatedOwner);
    } catch (error) {
      console.error("Erro ao ativar proprietário:", error);
      res.status(500).json({ message: "Erro ao ativar proprietário" });
    }
  });

  app.post("/api/owners/:id/deactivate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = Number(req.params.id);
      const owner = await storage.getOwner(id);
      
      if (!owner) {
        return res.status(404).json({ message: "Proprietário não encontrado" });
      }
      
      // Desativa o proprietário
      const updatedOwner = await storage.updateOwner(id, { isActive: false });
      res.json(updatedOwner);
    } catch (error) {
      console.error("Erro ao desativar proprietário:", error);
      res.status(500).json({ message: "Erro ao desativar proprietário" });
    }
  });

  app.patch("/api/tenants/:id/toggle-status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = Number(req.params.id);
      const tenant = await storage.getTenant(id);
      
      if (!tenant) {
        return res.status(404).json({ message: "Inquilino não encontrado" });
      }
      
      // Inverte o status atual
      const updatedTenant = await storage.updateTenant(id, { isActive: !tenant.isActive });
      res.json(updatedTenant);
    } catch (error) {
      console.error("Erro ao alterar status do inquilino:", error);
      res.status(500).json({ message: "Erro ao alterar status do inquilino" });
    }
  });

  // Rotas para ativar/desativar inquilinos
  app.post("/api/tenants/:id/activate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = Number(req.params.id);
      const tenant = await storage.getTenant(id);
      
      if (!tenant) {
        return res.status(404).json({ message: "Inquilino não encontrado" });
      }
      
      // Ativa o inquilino
      const updatedTenant = await storage.updateTenant(id, { isActive: true });
      res.json(updatedTenant);
    } catch (error) {
      console.error("Erro ao ativar inquilino:", error);
      res.status(500).json({ message: "Erro ao ativar inquilino" });
    }
  });

  app.post("/api/tenants/:id/deactivate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = Number(req.params.id);
      const tenant = await storage.getTenant(id);
      
      if (!tenant) {
        return res.status(404).json({ message: "Inquilino não encontrado" });
      }
      
      // Desativa o inquilino
      const updatedTenant = await storage.updateTenant(id, { isActive: false });
      res.json(updatedTenant);
    } catch (error) {
      console.error("Erro ao desativar inquilino:", error);
      res.status(500).json({ message: "Erro ao desativar inquilino" });
    }
  });

  // Rotas para ativar/desativar imóveis
  app.post("/api/properties/:id/toggle-available", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = Number(req.params.id);
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      
      // Inverte a disponibilidade
      const updatedProperty = await storage.updateProperty(id, 
        { availableForRent: !property.availableForRent });
      res.json(updatedProperty);
    } catch (error) {
      console.error("Erro ao alterar disponibilidade do imóvel:", error);
      res.status(500).json({ message: "Erro ao alterar disponibilidade do imóvel" });
    }
  });

  // Rota para converter todos os nomes para maiúsculas
  app.post("/api/system/convert-names-to-uppercase", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Apenas administradores podem executar esta operação
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores podem executar esta operação." });
      }
      
      const result = await convertAllNamesToUppercase();
      res.json({
        message: "Conversão de nomes para maiúsculas concluída com sucesso",
        result
      });
    } catch (error) {
      console.error("Erro ao converter nomes para maiúsculas:", error);
      res.status(500).json({ message: "Erro ao converter nomes para maiúsculas" });
    }
  });

  // CONTRACT TEMPLATES ROUTES
  app.get("/api/contract-templates", async (req, res) => {
    try {
      const templates = await storage.getContractTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Erro ao buscar modelos de contrato:", error);
      res.status(500).json({ message: "Erro ao obter modelos de contrato" });
    }
  });

  app.get("/api/contract-templates/:id", async (req, res) => {
    try {
      const template = await storage.getContractTemplate(Number(req.params.id));
      if (!template) {
        return res.status(404).json({ message: "Modelo de contrato não encontrado" });
      }
      res.json(template);
    } catch (error) {
      console.error("Erro ao buscar modelo de contrato:", error);
      res.status(500).json({ message: "Erro ao obter modelo de contrato" });
    }
  });

  app.post("/api/contract-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Log para diagnóstico
      console.log("Criando modelo de contrato: Nome =", req.body?.name, "Tipo =", req.body?.type, "Tamanho do conteúdo =", req.body?.content?.length || 0, "caracteres");
      
      try {
        const data = await contractTemplateValidationSchema.parseAsync(req.body);
        console.log("Validação passou com sucesso. Salvando modelo...");
        const template = await storage.createContractTemplate(data);
        console.log("Modelo criado com sucesso, ID:", template.id);
        res.status(201).json(template);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.error("Erro de validação:", validationError.errors);
          const formattedError = fromZodError(validationError);
          return res.status(400).json({ 
            message: "Erro de validação", 
            errors: formattedError.details
          });
        }
        throw validationError; // Passa o erro para o próximo catch se não for de validação
      }
    } catch (error) {
      console.error("Erro ao criar modelo de contrato:", error);
      // Enviar mais informações úteis para o frontend
      res.status(500).json({ 
        message: "Erro ao criar modelo de contrato", 
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.patch("/api/contract-templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = Number(req.params.id);
      
      // Log para diagnóstico
      console.log("Atualizando modelo de contrato ID:", id, "Nome =", req.body?.name, "Tipo =", req.body?.type, "Tamanho do conteúdo =", req.body?.content?.length || 0, "caracteres");
      
      try {
        const data = await insertContractTemplateSchema.partial().parseAsync(req.body);
        console.log("Validação passou com sucesso. Atualizando modelo...");
        const template = await storage.updateContractTemplate(id, data);
        
        if (!template) {
          console.log("Modelo não encontrado:", id);
          return res.status(404).json({ message: "Modelo de contrato não encontrado" });
        }
        
        console.log("Modelo atualizado com sucesso, ID:", template.id);
        res.json(template);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.error("Erro de validação:", validationError.errors);
          const formattedError = fromZodError(validationError);
          return res.status(400).json({ 
            message: "Erro de validação", 
            errors: formattedError.details
          });
        }
        throw validationError; // Passa o erro para o próximo catch se não for de validação
      }
    } catch (error) {
      console.error("Erro ao atualizar modelo de contrato:", error);
      // Enviar mais informações úteis para o frontend
      res.status(500).json({ 
        message: "Erro ao atualizar modelo de contrato", 
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.delete("/api/contract-templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const id = Number(req.params.id);
      const success = await storage.deleteContractTemplate(id);
      
      if (!success) {
        return res.status(404).json({ message: "Modelo de contrato não encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir modelo de contrato:", error);
      res.status(500).json({ message: "Erro ao excluir modelo de contrato" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
