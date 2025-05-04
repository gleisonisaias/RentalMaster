import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import type * as PDFKit from "pdfkit";

// Tipo estendido para o PDFDocument para resolver problemas de tipagem
type PDFDocumentWithMethods = PDFKit.PDFDocument & {
  moveTo(x: number, y: number): PDFKit.PDFDocument;
  lineTo(x: number, y: number): PDFKit.PDFDocument;
  stroke(): PDFKit.PDFDocument;
  rect(x: number, y: number, w: number, h: number): PDFKit.PDFDocument;
  currentLineHeight?(): number;
};

/**
 * Função para converter um valor numérico para texto por extenso em português
 * @param valor Valor a ser convertido (em números, não em centavos)
 * @returns Texto do valor por extenso
 */
function valorPorExtenso(valor: number): string {
  if (valor === 0) return "zero reais";
  
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dezenas = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const dez_a_dezenove = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  
  // Separar parte inteira e decimal
  const valorStr = valor.toFixed(2);
  const partes = valorStr.split('.');
  const valorInteiro = parseInt(partes[0], 10);
  const valorDecimal = parseInt(partes[1], 10);
  
  // Converter a parte inteira por extenso
  function converterGrupo(n: number): string {
    if (n === 0) return "";
    else if (n < 10) return unidades[n];
    else if (n < 20) return dez_a_dezenove[n - 10];
    else if (n < 100) {
      const dezena = Math.floor(n / 10);
      const unidade = n % 10;
      return dezenas[dezena] + (unidade !== 0 ? ` e ${unidades[unidade]}` : "");
    } else if (n < 1000) {
      const centena = Math.floor(n / 100);
      const resto = n % 100;
      return centenas[centena] + (resto !== 0 ? ` e ${converterGrupo(resto)}` : "");
    } else if (n < 1000000) {
      const milhar = Math.floor(n / 1000);
      const resto = n % 1000;
      const plural = milhar > 1 ? "mil" : "mil";
      return converterGrupo(milhar) + ` ${plural}` + (resto !== 0 ? ` e ${converterGrupo(resto)}` : "");
    } else {
      const milhao = Math.floor(n / 1000000);
      const resto = n % 1000000;
      const plural = milhao > 1 ? "milhões" : "milhão";
      return converterGrupo(milhao) + ` ${plural}` + (resto !== 0 ? ` e ${converterGrupo(resto)}` : "");
    }
  }
  
  let resultado = "";
  
  // Parte inteira
  if (valorInteiro === 0) {
    resultado = "zero reais";
  } else {
    resultado = converterGrupo(valorInteiro);
    resultado += valorInteiro === 1 ? " real" : " reais";
  }
  
  // Parte decimal
  if (valorDecimal > 0) {
    resultado += " e ";
    if (valorDecimal < 10) {
      resultado += `${unidades[valorDecimal]} centavo${valorDecimal !== 1 ? "s" : ""}`;
    } else if (valorDecimal < 20) {
      resultado += `${dez_a_dezenove[valorDecimal - 10]} centavos`;
    } else {
      const dezena = Math.floor(valorDecimal / 10);
      const unidade = valorDecimal % 10;
      resultado += dezenas[dezena];
      if (unidade !== 0) {
        resultado += ` e ${unidades[unidade]}`;
      }
      resultado += " centavos";
    }
  }
  
  // Primeira letra maiúscula
  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { storage } from "./storage";

/**
 * Função utilitária para formatar datas corretamente nos PDFs,
 * aplicando a correção para o problema de fuso horário
 * @param dateString String de data a ser formatada
 * @returns Data formatada no locale pt-BR
 */
function formatDateSafe(dateString: string): string {
  // Criar data a partir da string de data 
  const date = new Date(dateString);
  
  // IMPORTANTE: Subtrair 1 dia para ajustar o problema de fuso horário
  date.setDate(date.getDate() - 1);
  
  // Aplicar correção para o fuso horário de Brasília (GMT-3)
  // Definir para meio-dia UTC para garantir consistência
  date.setUTCHours(12, 0, 0, 0);
  
  // Formatar a data no formato brasileiro
  return date.toLocaleDateString('pt-BR');
}

/**
 * Função para obter o mês em português a partir de uma data corrigida
 * @param dateString String de data
 * @returns Nome do mês em português
 */
function getMonthNameSafe(dateString: string): string {
  // Criar data a partir da string de data 
  const date = new Date(dateString);
  
  // IMPORTANTE: Subtrair 1 dia para ajustar o problema de fuso horário
  date.setDate(date.getDate() - 1);
  
  // Aplicar correção para o fuso horário de Brasília (GMT-3)
  date.setUTCHours(12, 0, 0, 0);
  
  // Retornar o nome do mês no formato brasileiro
  return date.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
}

/**
 * Função para obter o ano a partir de uma data corrigida
 * @param dateString String de data
 * @returns Ano (4 dígitos)
 */
function getYearSafe(dateString: string): number {
  // Criar data a partir da string de data 
  const date = new Date(dateString);
  
  // IMPORTANTE: Subtrair 1 dia para ajustar o problema de fuso horário
  date.setDate(date.getDate() - 1);
  
  // Aplicar correção para o fuso horário de Brasília (GMT-3)
  date.setUTCHours(12, 0, 0, 0);
  
  // Retornar o ano
  return date.getFullYear();
}

/**
 * Gera carnês de pagamento para todas as parcelas de um contrato
 * Formato: 2 recibos por página para economizar papel
 */
/**
 * Função auxiliar para centralizar texto em uma posição Y específica
 * Resolve problemas de alinhamento em todos os textos
 */
function drawCenteredText(doc: PDFDocumentWithMethods, text: string, y: number, fontSize: number, fontStyle: string = 'Helvetica') {
  // Calcular o centro exato da página
  const centerX = doc.page.width / 2;
  
  // Definir fonte e tamanho
  doc.font(fontStyle).fontSize(fontSize);
  
  // Calcular largura do texto para posicionamento centralizado
  const textWidth = doc.widthOfString(text);
  
  // Escrever o texto centralizado
  doc.text(text, centerX - (textWidth / 2), y, {
    align: 'center', 
    width: textWidth
  });
  
  return { width: textWidth, height: doc.currentLineHeight?.() || 0 };
}

/**
 * Desenha um recibo completo na posição específica do documento
 * Garante alinhamento consistente de todos os elementos
 */
function drawPaymentSlip(
  doc: PDFDocumentWithMethods, 
  payment: any, 
  contractId: number, 
  owner: any, 
  tenant: any, 
  propertyAddress: any, 
  totalPayments: number, 
  installmentNumber: number,
  yPosition: number
) {
  // Definir a largura da página e centro
  const pageWidth = doc.page.width;
  const pageCenter = pageWidth / 2;
  
  // Calcular parâmetros do recibo
  const boxWidth = pageWidth - 80;
  const boxHeight = 180;
  const boxX = 40;
  const boxY = yPosition + 70; // Posição Y do quadro principal
  const padding = 10;
  
  // Desenhar o título centralizado (RECIBO DE PAGAMENTO - ALUGUEL)
  doc.font('Helvetica-Bold').fontSize(14);
  const title = 'RECIBO DE PAGAMENTO - ALUGUEL';
  const titleWidth = doc.widthOfString(title);
  doc.text(title, pageCenter - (titleWidth / 2), yPosition);
  
  // Mês/Ano centralizado
  const month = getMonthNameSafe(payment.dueDate);
  const year = getYearSafe(payment.dueDate);
  const monthYear = `${month} / ${year}`;
  
  doc.fontSize(12);
  const monthYearWidth = doc.widthOfString(monthYear);
  doc.text(monthYear, pageCenter - (monthYearWidth / 2), yPosition + 20);
  
  // Número da parcela centralizado
  doc.fontSize(10);
  const parcela = `Parcela ${installmentNumber} de ${totalPayments} - Contrato Nº ${contractId}`;
  const parcelaWidth = doc.widthOfString(parcela);
  doc.text(parcela, pageCenter - (parcelaWidth / 2), yPosition + 40);
  
  // Desenhar borda do quadro principal
  doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();
  
  // Desenhar linhas horizontais internas
  const midY1 = boxY + boxHeight/3;
  const midY2 = boxY + (boxHeight*2/3);
  doc.moveTo(boxX, midY1).lineTo(boxX + boxWidth, midY1).stroke();
  doc.moveTo(boxX, midY2).lineTo(boxX + boxWidth, midY2).stroke();
  
  // Linha vertical central
  const midX = boxX + boxWidth/2;
  doc.moveTo(midX, boxY).lineTo(midX, boxY + boxHeight).stroke();
  
  // Cálculo de largura para as colunas
  const colWidth = boxWidth/2 - padding;
  
  // PRIMEIRA LINHA: Locador e Locatário
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('LOCADOR:', boxX + padding, boxY + padding);
  doc.font('Helvetica').fontSize(9);
  doc.text(owner.name, boxX + padding, boxY + padding + 15, { width: colWidth - padding });
  
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('LOCATÁRIO:', midX + padding, boxY + padding);
  doc.font('Helvetica').fontSize(9);
  doc.text(tenant.name, midX + padding, boxY + padding + 15, { width: colWidth - padding });
  
  // SEGUNDA LINHA: Imóvel e Vencimento
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('IMÓVEL:', boxX + padding, midY1 + padding);
  doc.font('Helvetica').fontSize(7);
  const fullAddress = `${propertyAddress.street}, ${propertyAddress.number}${propertyAddress.complement ? ', ' + propertyAddress.complement : ''}, ${propertyAddress.neighborhood}, ${propertyAddress.city} - ${propertyAddress.state}`;
  doc.text(fullAddress, boxX + padding, midY1 + padding + 15, { width: colWidth - padding });
  
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('VENCIMENTO:', midX + padding, midY1 + padding);
  doc.font('Helvetica').fontSize(9);
  doc.text(formatDateSafe(payment.dueDate), midX + padding, midY1 + padding + 15);
  
  // TERCEIRA LINHA: Valor e Data do Pagamento
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('VALOR:', boxX + padding, midY2 + padding);
  
  // Adicionar um retângulo destacando o valor (com fundo cinza claro)
  doc.rect(boxX + padding, midY2 + padding + 12, colWidth - 10, 20).fillAndStroke('#f0f0f0', '#000000');
  
  // Destacar o valor numérico com fonte MUITO maior (16pt) e em negrito
  doc.font('Helvetica-Bold').fontSize(16);
  doc.fillColor('#000000'); // Garantir que a cor do texto seja preta
  doc.text(`R$ ${payment.value.toFixed(2).replace('.', ',')}`, 
          boxX + padding + 5, midY2 + padding + 15,
          { width: colWidth - 20 });
  
  // Adicionar valor por extenso em fonte regular, maior (9pt)
  doc.font('Helvetica').fontSize(9);
  
  // Utilizar a função para converter o valor em texto por extenso
  const valorExtenso = valorPorExtenso(payment.value);
  doc.text(`(${valorExtenso})`, boxX + padding, midY2 + padding + 35, { width: colWidth - padding });
  
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('DATA DO PAGAMENTO:', midX + padding, midY2 + padding);
  // Não adicionamos texto aqui para deixar o campo em branco para preenchimento manual
  
  // Assinatura
  const signatureY = boxY + boxHeight + 40;
  
  // Centralizar linha de assinatura
  doc.fontSize(9);
  const signatureLineText = '_____________________________________________';
  const signatureLineWidth = doc.widthOfString(signatureLineText);
  doc.text(signatureLineText, pageCenter - (signatureLineWidth / 2), signatureY);
  
  // Texto abaixo da linha de assinatura
  const signatureText = 'Assinatura do recebedor';
  const signatureTextWidth = doc.widthOfString(signatureText);
  doc.text(signatureText, pageCenter - (signatureTextWidth / 2), signatureY + 15);
  
  // Retorna a posição Y final para possível uso posterior
  return signatureY + 40;
}

export async function generatePaymentSlipsPDF(req: Request, res: Response) {
  try {
    const contractId = Number(req.params.id);
    if (isNaN(contractId)) {
      return res.status(400).json({ error: 'ID de contrato inválido' });
    }

    // Buscar dados do contrato
    const contract = await storage.getContract(contractId);
    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    // Buscar dados relacionados
    const owner = await storage.getOwner(contract.ownerId);
    const tenant = await storage.getTenant(contract.tenantId);
    const property = await storage.getProperty(contract.propertyId);

    if (!owner || !tenant || !property) {
      return res.status(404).json({ error: 'Dados relacionados não encontrados' });
    }

    // Buscar pagamentos
    const payments = await storage.getPaymentsByContract(contractId);
    
    // Filtrar apenas pagamentos não pagos
    const pendingPayments = payments.filter(payment => !payment.isPaid);
    
    if (pendingPayments.length === 0) {
      return res.status(404).json({ error: 'Não há parcelas pendentes para gerar carnês' });
    }

    // Formatar o endereço da propriedade
    const propertyAddress = typeof property.address === 'string' 
      ? JSON.parse(property.address) 
      : property.address;
    
    // Ordenar pagamentos por data de vencimento
    pendingPayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    // Criar um arquivo temporário para o PDF
    const tempFilePath = path.join(os.tmpdir(), `carnes_pagamento_${contractId}_${Date.now()}.pdf`);
    
    // Criar documento PDF
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40
      },
      info: {
        Title: `Carnês de Pagamento - Contrato ${contractId}`,
        Author: 'Sistema de Gestão de Aluguéis',
      }
    }) as PDFDocumentWithMethods;
    
    // Stream para arquivo
    const writeStream = fs.createWriteStream(tempFilePath);
    doc.pipe(writeStream);
    
    // Adicionar página de capa com informações gerais
    doc.fontSize(20).font('Helvetica-Bold').text('CARNÊS DE PAGAMENTO', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text(`Contrato Nº: ${contractId}`, { align: 'center' });
    doc.moveDown(2);
    
    // Informações das partes
    doc.fontSize(12).font('Helvetica-Bold').text('LOCADOR (PROPRIETÁRIO):');
    doc.fontSize(10).font('Helvetica').text(`Nome: ${owner.name}`);
    doc.text(`CPF: ${owner.document}`);
    doc.moveDown(1);
    
    doc.fontSize(12).font('Helvetica-Bold').text('LOCATÁRIO (INQUILINO):');
    doc.fontSize(10).font('Helvetica').text(`Nome: ${tenant.name}`);
    doc.text(`CPF: ${tenant.document}`);
    doc.moveDown(1);
    
    // Informações do imóvel
    doc.fontSize(12).font('Helvetica-Bold').text('IMÓVEL:');
    const propertyAddressStr = `${propertyAddress.street}, ${propertyAddress.number}${propertyAddress.complement ? ', ' + propertyAddress.complement : ''}, ${propertyAddress.neighborhood}, ${propertyAddress.city} - ${propertyAddress.state}`;
    doc.fontSize(10).font('Helvetica').text(propertyAddressStr);
    doc.moveDown(1);
    
    // Informações do contrato
    doc.fontSize(12).font('Helvetica-Bold').text('INFORMAÇÕES DO CONTRATO:');
    doc.fontSize(10).font('Helvetica').text(`Valor do Aluguel: R$ ${contract.rentValue.toFixed(2).replace('.', ',')}`);
    doc.text(`Início: ${formatDateSafe(contract.startDate)}`);
    doc.text(`Término: ${formatDateSafe(contract.endDate)}`);
    doc.text(`Duração: ${contract.duration} meses`);
    doc.moveDown(2);
    
    // Tabela de sumário das parcelas
    doc.fontSize(12).font('Helvetica-Bold').text('PARCELAS INCLUÍDAS:');
    doc.moveDown(0.5);
    
    // Cabeçalho da tabela
    doc.fontSize(10).font('Helvetica-Bold');
    const yPos = doc.y;
    doc.text('Nº', 40, yPos, { width: 30 });
    doc.text('Vencimento', 70, yPos, { width: 100 });
    doc.text('Valor (R$)', 170, yPos, { width: 100, align: 'right' });
    
    // Linha horizontal
    const lineY = doc.y + 5;
    doc.moveTo(40, lineY).lineTo(270, lineY).stroke();
    doc.moveDown(0.5);
    
    // Listar parcelas
    pendingPayments.forEach((payment, index) => {
      doc.fontSize(10).font('Helvetica');
      const rowY = doc.y;
      doc.text(`${index + 1}`, 40, rowY, { width: 30 });
      doc.text(formatDateSafe(payment.dueDate), 70, rowY, { width: 100 });
      doc.text(payment.value.toFixed(2).replace('.', ','), 170, rowY, { width: 100, align: 'right' });
      doc.moveDown(0.5);
    });
    
    // Total
    const totalValue = pendingPayments.reduce((sum, payment) => sum + payment.value, 0);
    
    // Linha horizontal final
    const finalLineY = doc.y;
    doc.moveTo(40, finalLineY).lineTo(270, finalLineY).stroke();
    doc.moveDown(0.5);
    
    doc.fontSize(10).font('Helvetica-Bold');
    const totalY = doc.y;
    doc.text('TOTAL:', 40, totalY, { width: 130 });
    doc.text(totalValue.toFixed(2).replace('.', ','), 170, totalY, { width: 100, align: 'right' });
    
    doc.moveDown(2);
    
    // Instruções
    doc.fontSize(10).font('Helvetica');
    doc.text('Este documento contém os carnês para pagamento das parcelas do seu contrato de aluguel. Nas páginas seguintes você encontrará 2 recibos por folha. Recorte nos locais indicados pelas linhas tracejadas para separar os recibos.', { align: 'justify' });
    
    // Gerar páginas com 2 recibos por página - usando a nova função auxiliar
    for (let i = 0; i < pendingPayments.length; i += 2) {
      // Nova página para cada par de recibos
      doc.addPage();
      
      // Linha pontilhada no topo da página
      const pageWidth = doc.page.width;
      const pageCenter = pageWidth / 2;
      const topCutLineY = doc.y;
      
      // Linha pontilhada superior
      drawCenteredText(doc, '✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -', 
                      topCutLineY, 9);
      
      // Primeiro recibo
      const yPos1 = topCutLineY + 15; // Posição Y após a linha pontilhada
      const payment1 = pendingPayments[i];
      const bottomPos1 = drawPaymentSlip(
        doc,
        payment1,
        contractId,
        owner, 
        tenant, 
        propertyAddress,
        pendingPayments.length,
        i + 1,  // Número da parcela (começando em 1)
        yPos1
      );
      
      // Linha pontilhada divisória
      drawCenteredText(doc, '✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -', 
                      bottomPos1, 9);
      
      // Segundo recibo (se existir)
      if (i + 1 < pendingPayments.length) {
        const yPos2 = bottomPos1 + 20; // Posição Y após a linha pontilhada divisória
        const payment2 = pendingPayments[i + 1];
        
        // Linha pontilhada superior do segundo recibo
        drawCenteredText(doc, '✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -', 
                         yPos2, 9);
        
        // Desenhar o segundo recibo
        drawPaymentSlip(
          doc,
          payment2,
          contractId,
          owner, 
          tenant, 
          propertyAddress,
          pendingPayments.length,
          i + 2,  // Número da parcela (começando em 1)
          yPos2 + 15
        );
      }
    }
    
    // Finalizar o documento
    doc.end();
    
    // Aguardar o término da gravação do arquivo
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => {
        resolve();
      });
      writeStream.on('error', (err) => {
        reject(err);
      });
    });
    
    // Enviar o arquivo como resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="carnes_contrato_${contractId}.pdf"`);
    
    // Ler o arquivo e enviá-lo
    const fileStream = fs.createReadStream(tempFilePath);
    fileStream.pipe(res);
    
    // Remover o arquivo temporário após o envio
    fileStream.on('end', () => {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error('Erro ao excluir arquivo temporário:', err);
      });
    });
  } catch (error) {
    console.error('Erro ao gerar carnês de pagamento:', error);
    res.status(500).json({ error: 'Erro ao gerar carnês de pagamento' });
  }
}