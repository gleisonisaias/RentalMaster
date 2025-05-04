/**
 * Serviço para geração de fichas cadastrais de inquilinos
 * Permite a impressão das informações de inquilinos e fiadores
 */

import { Request, Response } from "express";
import path from "path";
import { db } from "./db";
import { tenants } from "@shared/schema";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";

/**
 * Gera a ficha cadastral do inquilino em PDF
 */
export async function generateTenantRegistrationForm(req: Request, res: Response) {
  try {
    const tenantId = parseInt(req.params.id);

    if (isNaN(tenantId)) {
      return res.status(400).json({ error: "ID de inquilino inválido" });
    }

    // Buscar dados do inquilino
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));

    if (!tenant) {
      return res.status(404).json({ error: "Inquilino não encontrado" });
    }

    // Parse do endereço e fiador se estiverem armazenados como strings
    const tenantAddress = typeof tenant.address === 'string' ? JSON.parse(tenant.address) : tenant.address;
    const guarantor = typeof tenant.guarantor === 'string' ? JSON.parse(tenant.guarantor) : tenant.guarantor;

    // Criar o documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      info: {
        Title: `Ficha Cadastral - ${tenant.name}`,
        Author: 'Sistema de Gestão Imobiliária',
      }
    });

    // Configurar headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ficha-cadastral-${tenant.id}.pdf`);

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

    const drawField = (label: string, value: string | null | undefined, x: number, y: number, width: number) => {
      // @ts-ignore - pdfkit tipos não refletem corretamente a API
      doc.fontSize(9).text(label, x, y);
      
      // Desenhar um retângulo para o campo de valor
      // @ts-ignore
      doc.rect(x, y + 15, width, 25).stroke();
      
      // Adicionar valor se existir
      if (value) {
        doc.fontSize(11).text(value, x + 5, y + 22, { width: width - 10 });
      }
      
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
    y = drawField('Nome completo', tenant.name, 50, y, 495);

    // CPF e RG
    const nextY = drawField('CPF', tenant.document, 50, y, 240);
    y = drawField('RG', tenant.rg || '', 310, y, 235);
    y = Math.max(y, nextY);

    // Telefone e E-mail
    const nextY2 = drawField('Telefone', tenant.phone, 50, y, 240);
    y = drawField('E-mail', tenant.email, 310, y, 235);
    y = Math.max(y, nextY2);

    // Nacionalidade e Profissão
    const nextY3 = drawField('Nacionalidade', tenant.nationality || '', 50, y, 240);
    y = drawField('Profissão', tenant.profession || '', 310, y, 235);
    y = Math.max(y, nextY3);

    // Estado Civil e Nome do Cônjuge
    const nextY4 = drawField('Estado Civil', tenant.maritalStatus || '', 50, y, 240);
    y = drawField('Nome do Cônjuge', tenant.spouseName || '', 310, y, 235);
    y = Math.max(y, nextY4);

    // Informações de Endereço
    doc.addPage();
    
    doc.font('Helvetica-Bold').fontSize(14);
    doc.text('Endereço do Inquilino', 50, 50);
    // @ts-ignore
    doc.moveTo(50, 70).lineTo(545, 70).stroke();

    y = 80;

    // CEP e Rua
    const nextY5 = drawField('CEP', tenantAddress?.zipCode || '', 50, y, 240);
    y = drawField('Rua', tenantAddress?.street || '', 310, y, 235);
    y = Math.max(y, nextY5);

    // Número e Complemento
    const nextY6 = drawField('Número', tenantAddress?.number || '', 50, y, 240);
    y = drawField('Complemento', tenantAddress?.complement || '', 310, y, 235);
    y = Math.max(y, nextY6);

    // Bairro e Cidade
    const nextY7 = drawField('Bairro', tenantAddress?.neighborhood || '', 50, y, 240);
    y = drawField('Cidade', tenantAddress?.city || '', 310, y, 235);
    y = Math.max(y, nextY7);

    // Estado
    y = drawField('Estado', tenantAddress?.state || '', 50, y, 240);

    // Seção do Fiador (se existir)
    if (guarantor && (guarantor.name || guarantor.document)) {
      y += 20;
      doc.font('Helvetica-Bold').fontSize(14);
      doc.text('Dados do Fiador', 50, y);
      y += 20;
      // @ts-ignore
      doc.moveTo(50, y).lineTo(545, y).stroke();
      y += 10;

      // Nome completo (campo maior)
      y = drawField('Nome completo', guarantor.name || '', 50, y, 495);

      // CPF e RG
      const nextY8 = drawField('CPF', guarantor.document || '', 50, y, 240);
      y = drawField('RG', guarantor.rg || '', 310, y, 235);
      y = Math.max(y, nextY8);

      // Telefone e E-mail
      const nextY9 = drawField('Telefone', guarantor.phone || '', 50, y, 240);
      y = drawField('E-mail', guarantor.email || '', 310, y, 235);
      y = Math.max(y, nextY9);

      // Nacionalidade e Profissão
      const nextY10 = drawField('Nacionalidade', guarantor.nationality || '', 50, y, 240);
      y = drawField('Profissão', guarantor.profession || '', 310, y, 235);
      y = Math.max(y, nextY10);

      // Estado Civil e Nome do Cônjuge
      const nextY11 = drawField('Estado Civil', guarantor.maritalStatus || '', 50, y, 240);
      y = drawField('Nome do Cônjuge', guarantor.spouseName || '', 310, y, 235);
      y = Math.max(y, nextY11);
    }

    // Finalizar o documento
    doc.end();
  } catch (error) {
    console.error("Erro ao gerar ficha cadastral:", error);
    res.status(500).json({ error: "Erro ao gerar ficha cadastral" });
  }
}