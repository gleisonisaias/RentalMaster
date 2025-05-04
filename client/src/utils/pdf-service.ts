// PDF generation service using pdfkit and blob-stream
import { formatCPF, formatPhone } from './validation';
import type { Contract, Owner, Property, Tenant } from '@shared/schema';

// Importações ESM para Vite
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
import blobStream from 'blob-stream';

// Interface para PDFKit
interface PDFDocumentType {
  font(name: string): PDFDocumentType;
  fontSize(size: number): PDFDocumentType;
  text(text: string, options?: any): PDFDocumentType;
  text(text: string, x: number, y: number, options?: any): PDFDocumentType;
  moveDown(lines?: number): PDFDocumentType;
  addPage(options?: any): PDFDocumentType;
  end(): void;
  pipe(destination: any): any;
  y: number;
  page: {
    width: number;
    height: number;
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
}

// Tipos para melhorar a legibilidade
interface ContractData {
  contract: Contract;
  owner: Owner;
  tenant: Tenant;
  property: Property;
}

interface SignatureField {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

/**
 * Classe responsável pela geração de diferentes tipos de contratos em PDF
 */
export class ContractPDFGenerator {
  /**
   * Converte um valor numérico para texto por extenso
   */
  private static valueToWords(value: number): string {
    if (value === 0) return 'zero reais';
    
    const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    
    let result = '';
    
    // Trata reais (parte inteira)
    const intValue = Math.floor(value);
    if (intValue > 0) {
      // Milhares
      if (intValue >= 1000) {
        const thousands = Math.floor(intValue / 1000);
        if (thousands === 1) {
          result += 'mil ';
        } else {
          if (thousands < 10) {
            result += units[thousands] + ' mil ';
          } else if (thousands < 20) {
            result += teens[thousands - 10] + ' mil ';
          } else {
            const tenDigit = Math.floor(thousands / 10);
            const unitDigit = thousands % 10;
            result += tens[tenDigit];
            if (unitDigit > 0) {
              result += ' e ' + units[unitDigit];
            }
            result += ' mil ';
          }
        }
      }
      
      // Centenas
      const remainder = intValue % 1000;
      if (remainder >= 100) {
        const hundred = Math.floor(remainder / 100);
        if (remainder === 100) {
          result += 'cem';
        } else {
          result += hundreds[hundred];
        }
        
        const remainderTens = remainder % 100;
        if (remainderTens > 0) {
          result += ' e ';
        }
      }
      
      // Dezenas e Unidades
      const remainderTens = remainder % 100;
      if (remainderTens > 0) {
        if (remainderTens < 10) {
          result += units[remainderTens];
        } else if (remainderTens < 20) {
          result += teens[remainderTens - 10];
        } else {
          const tenDigit = Math.floor(remainderTens / 10);
          const unitDigit = remainderTens % 10;
          result += tens[tenDigit];
          if (unitDigit > 0) {
            result += ' e ' + units[unitDigit];
          }
        }
      }
      
      result += intValue === 1 ? ' real' : ' reais';
    }
    
    // Trata centavos
    const cents = Math.round((value - intValue) * 100);
    if (cents > 0) {
      if (intValue > 0) {
        result += ' e ';
      }
      
      if (cents < 10) {
        result += units[cents];
      } else if (cents < 20) {
        result += teens[cents - 10];
      } else {
        const tenDigit = Math.floor(cents / 10);
        const unitDigit = cents % 10;
        result += tens[tenDigit];
        if (unitDigit > 0) {
          result += ' e ' + units[unitDigit];
        }
      }
      
      result += cents === 1 ? ' centavo' : ' centavos';
    }
    
    return result;
  }
  /**
   * Gera um contrato residencial com base nos dados fornecidos
   */
  static async generateResidentialContract(data: ContractData): Promise<Blob> {
    const { contract, owner, tenant, property } = data;
    
    // Criar documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      info: {
        Title: `Contrato de Locação Residencial - ${owner.name} e ${tenant.name}`,
        Author: 'Sistema de Gestão de Contratos de Aluguel',
        Subject: 'Contrato de Locação Residencial',
        Keywords: 'aluguel, contrato, locação, residencial',
        CreationDate: new Date(),
      }
    });
    
    // Criar stream para obter o blob
    const stream = doc.pipe(blobStream());
    
    // Adicionar cabeçalho
    this.addHeader(doc, 'CONTRATO DE LOCAÇÃO RESIDENCIAL');
    
    // Adicionar informações das partes
    this.addParties(doc, owner, tenant);
    
    // Adicionar informações do imóvel
    this.addPropertyInfo(doc, property);
    
    // Adicionar cláusulas do contrato
    this.addResidentialContractClauses(doc, contract, property);
    
    // Adicionar local para assinaturas
    this.addSignatureFields(doc);
    
    // Finalizar o documento
    doc.end();
    
    // Retornar Promise que resolve com o Blob quando o stream estiver concluído
    return new Promise((resolve) => {
      stream.on('finish', () => {
        const blob = stream.toBlob('application/pdf');
        resolve(blob);
      });
    });
  }
  
  /**
   * Gera um contrato comercial com base nos dados fornecidos
   */
  static async generateCommercialContract(data: ContractData): Promise<Blob> {
    const { contract, owner, tenant, property } = data;
    
    // Criar documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      info: {
        Title: `Contrato de Locação Comercial - ${owner.name} e ${tenant.name}`,
        Author: 'Sistema de Gestão de Contratos de Aluguel',
        Subject: 'Contrato de Locação Comercial',
        Keywords: 'aluguel, contrato, locação, comercial',
        CreationDate: new Date(),
      }
    });
    
    // Criar stream para obter o blob
    const stream = doc.pipe(blobStream());
    
    // Adicionar cabeçalho
    this.addHeader(doc, 'CONTRATO DE LOCAÇÃO COMERCIAL');
    
    // Adicionar informações das partes
    this.addParties(doc, owner, tenant);
    
    // Adicionar informações do imóvel
    this.addPropertyInfo(doc, property);
    
    // Adicionar cláusulas do contrato
    this.addCommercialContractClauses(doc, contract, property);
    
    // Adicionar local para assinaturas
    this.addSignatureFields(doc);
    
    // Finalizar o documento
    doc.end();
    
    // Retornar Promise que resolve com o Blob quando o stream estiver concluído
    return new Promise((resolve) => {
      stream.on('finish', () => {
        const blob = stream.toBlob('application/pdf');
        resolve(blob);
      });
    });
  }
  
  /**
   * Gera um recibo de pagamento com base nos dados fornecidos
   */
  static async generatePaymentReceipt(
    paymentId: number, 
    contractNumber: number,
    ownerName: string,
    tenantName: string,
    propertyAddress: string,
    paymentValue: number,
    paymentDate: string,
    paymentMonth: string
  ): Promise<Blob> {
    // Criar documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      info: {
        Title: `Recibo de Pagamento de Aluguel - ${paymentMonth}`,
        Author: 'Sistema de Gestão de Contratos de Aluguel',
        Subject: 'Recibo de Pagamento',
        Keywords: 'aluguel, recibo, pagamento',
        CreationDate: new Date(),
      }
    });
    
    // Criar stream para obter o blob
    const stream = doc.pipe(blobStream());
    
    // Adicionar cabeçalho
    this.addHeader(doc, 'RECIBO DE PAGAMENTO DE ALUGUEL');
    
    // Adicionar informações do recibo
    doc.moveDown(2);
    doc.fontSize(12);
    
    doc.text(`Recibo Nº: ${paymentId}`, { align: 'left' });
    doc.text(`Contrato Nº: ${contractNumber}`, { align: 'left' });
    doc.text(`Data de Pagamento: ${paymentDate}`, { align: 'left' });
    doc.moveDown();
    
    doc.text(`Recebi de ${tenantName} a importância de R$ ${(paymentValue/100).toFixed(2)} (${this.valueToWords(paymentValue/100)}), referente ao aluguel do imóvel situado em ${propertyAddress}, relativo ao mês de ${paymentMonth}.`, { align: 'justify' });
    
    doc.moveDown(2);
    doc.text(`Para maior clareza, firmo o presente recibo para que produza os seus jurídicos e legais efeitos.`, { align: 'justify' });
    
    doc.moveDown(4);
    doc.text(`_________________________________________`, { align: 'center' });
    doc.text(`${ownerName}`, { align: 'center' });
    doc.text(`Proprietário`, { align: 'center' });
    
    // Finalizar o documento
    doc.end();
    
    // Retornar Promise que resolve com o Blob quando o stream estiver concluído
    return new Promise((resolve) => {
      stream.on('finish', () => {
        const blob = stream.toBlob('application/pdf');
        resolve(blob);
      });
    });
  }
  
  /* Funções auxiliares */
  
  private static addHeader(doc: PDFDocumentType, title: string) {
    doc.font('Helvetica-Bold')
       .fontSize(16)
       .text(title, { align: 'center' });
    
    doc.moveDown();
    
    // Adiciona a data atual
    const today = new Date();
    const formattedDate = today.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    doc.fontSize(10)
       .text(`Data de emissão: ${formattedDate}`, { align: 'right' });
    
    doc.moveDown(2);
  }
  
  private static addParties(doc: PDFDocumentType, owner: Owner, tenant: Tenant) {
    // Formatando as informações do Locador (proprietário)
    const ownerAddress = typeof owner.address === 'string' 
      ? JSON.parse(owner.address) 
      : owner.address;
    
    const ownerAddressStr = `${ownerAddress.street}, ${ownerAddress.number}${ownerAddress.complement ? ', ' + ownerAddress.complement : ''}, ${ownerAddress.neighborhood}, ${ownerAddress.city} - ${ownerAddress.state}, CEP: ${ownerAddress.zipCode}`;
    
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text('LOCADOR:');
    
    doc.font('Helvetica')
       .fontSize(11)
       .text(`Nome: ${owner.name}`)
       .text(`CPF/CNPJ: ${owner.document}`)
       .text(`Endereço: ${ownerAddressStr}`)
       .text(`Telefone: ${owner.phone}`)
       .text(`E-mail: ${owner.email}`);
    
    doc.moveDown();
    
    // Formatando as informações do Locatário (inquilino)
    const tenantAddress = typeof tenant.address === 'string' 
      ? JSON.parse(tenant.address) 
      : tenant.address;
    
    const tenantAddressStr = `${tenantAddress.street}, ${tenantAddress.number}${tenantAddress.complement ? ', ' + tenantAddress.complement : ''}, ${tenantAddress.neighborhood}, ${tenantAddress.city} - ${tenantAddress.state}, CEP: ${tenantAddress.zipCode}`;
    
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text('LOCATÁRIO:');
    
    doc.font('Helvetica')
       .fontSize(11)
       .text(`Nome: ${tenant.name}`)
       .text(`CPF/CNPJ: ${tenant.document}`)
       .text(`RG: ${tenant.rg || 'Não informado'}`)
       .text(`Endereço: ${tenantAddressStr}`)
       .text(`Telefone: ${tenant.phone}`)
       .text(`E-mail: ${tenant.email}`);
    
    // Informações do fiador, se existir
    const guarantor = tenant.guarantor 
      ? (typeof tenant.guarantor === 'string' ? JSON.parse(tenant.guarantor) : tenant.guarantor) 
      : null;
    
    if (guarantor && guarantor.name) {
      doc.moveDown();
      
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .text('FIADOR:');
      
      doc.font('Helvetica')
         .fontSize(11)
         .text(`Nome: ${guarantor.name}`)
         .text(`CPF/CNPJ: ${guarantor.document || 'Não informado'}`)
         .text(`Telefone: ${guarantor.phone || 'Não informado'}`)
         .text(`E-mail: ${guarantor.email || 'Não informado'}`);
      
      if (guarantor.address) {
        const guarantorAddressStr = `${guarantor.address.street}, ${guarantor.address.number}${guarantor.address.complement ? ', ' + guarantor.address.complement : ''}, ${guarantor.address.neighborhood}, ${guarantor.address.city} - ${guarantor.address.state}, CEP: ${guarantor.address.zipCode}`;
        
        doc.text(`Endereço: ${guarantorAddressStr}`);
      }
    }
    
    doc.moveDown(2);
  }
  
  private static addPropertyInfo(doc: PDFDocumentType, property: Property) {
    const propertyAddress = typeof property.address === 'string' 
      ? JSON.parse(property.address) 
      : property.address;
    
    const propertyAddressStr = `${propertyAddress.street}, ${propertyAddress.number}${propertyAddress.complement ? ', ' + propertyAddress.complement : ''}, ${propertyAddress.neighborhood}, ${propertyAddress.city} - ${propertyAddress.state}, CEP: ${propertyAddress.zipCode}`;
    
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text('OBJETO DA LOCAÇÃO:');
    
    doc.font('Helvetica')
       .fontSize(11)
       .text(`Imóvel: ${property.type.charAt(0).toUpperCase() + property.type.slice(1)}`)
       .text(`Endereço: ${propertyAddressStr}`)
       .text(`Valor do Aluguel: R$ ${(property.rentValue/100).toFixed(2)}`)
       .text(`Área: ${property.area || 'Não informada'} m²`)
       .text(`Quartos: ${property.bedrooms || 'Não informado'}`)
       .text(`Banheiros: ${property.bathrooms || 'Não informado'}`);
    
    // Adicionar informações de concessionárias, se disponíveis
    if (property.waterCompany || property.electricityCompany) {
      doc.moveDown();
      doc.font('Helvetica-Bold')
         .text('INFORMAÇÕES DE CONCESSIONÁRIAS:');
      
      doc.font('Helvetica');
      
      if (property.waterCompany) {
        doc.text(`Companhia de Água: ${property.waterCompany}`);
        
        if (property.waterAccountNumber) {
          doc.text(`Número da Conta de Água: ${property.waterAccountNumber}`);
        }
      }
      
      if (property.electricityCompany) {
        doc.text(`Companhia de Energia: ${property.electricityCompany}`);
        
        if (property.electricityAccountNumber) {
          doc.text(`Número da Conta de Energia: ${property.electricityAccountNumber}`);
        }
      }
    }
    
    doc.moveDown(2);
  }
  
  private static addResidentialContractClauses(doc: PDFDocumentType, contract: Contract, property: Property) {
    const startDate = new Date(contract.startDate).toLocaleDateString('pt-BR');
    const endDate = new Date(contract.endDate).toLocaleDateString('pt-BR');
    const rentValue = (contract.rentValue/100).toFixed(2);
    
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text('CLÁUSULAS E CONDIÇÕES:');
    
    doc.font('Helvetica')
       .fontSize(11);
    
    // Cláusula 1 - Prazo
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 1ª - PRAZO', { underline: true });
    
    doc.font('Helvetica')
       .text(`A locação terá início em ${startDate} e término em ${endDate}, pelo período de ${contract.duration} meses. Ao término deste prazo, não havendo manifestação por escrito de qualquer das partes, o contrato será prorrogado por prazo indeterminado.`, { align: 'justify' });
    
    // Cláusula 2 - Valor e forma de pagamento
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 2ª - VALOR E FORMA DE PAGAMENTO', { underline: true });
    
    doc.font('Helvetica')
       .text(`O aluguel mensal é de R$ ${rentValue} (${this.valueToWords(Number(rentValue))}), a ser pago até o dia ${contract.paymentDay} de cada mês, mediante depósito bancário ou outra forma a ser acordada entre as partes.`, { align: 'justify' })
       .text(`Parágrafo Único: O atraso no pagamento acarretará multa de 10% (dez por cento) sobre o valor do aluguel, além de juros de 1% (um por cento) ao mês, calculados pro rata die.`, { align: 'justify' });
    
    // Cláusula 3 - Reajuste
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 3ª - REAJUSTE', { underline: true });
    
    doc.font('Helvetica')
       .text(`O valor do aluguel será reajustado anualmente, de acordo com a variação do Índice Geral de Preços - Mercado (IGP-M) da Fundação Getúlio Vargas, ou outro índice que vier a substituí-lo.`, { align: 'justify' });
    
    // Cláusula 4 - Destinação do imóvel
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 4ª - DESTINAÇÃO DO IMÓVEL', { underline: true });
    
    doc.font('Helvetica')
       .text(`O imóvel objeto deste contrato destina-se exclusivamente para fins residenciais, não podendo o LOCATÁRIO utilizá-lo para outros fins sem prévia autorização por escrito do LOCADOR.`, { align: 'justify' });
    
    // Cláusula 5 - Despesas e encargos
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 5ª - DESPESAS E ENCARGOS', { underline: true });
    
    doc.font('Helvetica')
       .text(`Correrão por conta do LOCATÁRIO as despesas com taxas de luz, água, telefone, gás, condomínio e outras taxas que incidam ou venham a incidir sobre o imóvel, bem como o Imposto Predial e Territorial Urbano (IPTU).`, { align: 'justify' });
    
    // Cláusula 6 - Conservação e restituição do imóvel
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 6ª - CONSERVAÇÃO E RESTITUIÇÃO DO IMÓVEL', { underline: true });
    
    doc.font('Helvetica')
       .text(`O LOCATÁRIO obriga-se a conservar o imóvel e a devolvê-lo, ao final da locação, em perfeitas condições de uso e conservação, inclusive com pintura nova, responsabilizando-se pelos danos que porventura sobrevierem ao imóvel durante a locação.`, { align: 'justify' });
    
    // Cláusula 7 - Benfeitorias
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 7ª - BENFEITORIAS', { underline: true });
    
    doc.font('Helvetica')
       .text(`O LOCATÁRIO não poderá fazer no imóvel, sem prévia autorização por escrito do LOCADOR, benfeitorias ou modificações de qualquer natureza. As benfeitorias úteis ou voluptuárias realizadas pelo LOCATÁRIO, ainda que autorizadas, não serão indenizáveis e ficarão incorporadas ao imóvel.`, { align: 'justify' });
    
    // Adicionando mais cláusulas se necessário, verificando o espaço disponível na página
    if (doc.y > 700) {
      doc.addPage();
    }
    
    // Cláusula 8 - Garantia
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 8ª - GARANTIA', { underline: true });
    
    doc.font('Helvetica')
       .text(`Para garantir as obrigações assumidas neste contrato, o LOCATÁRIO apresenta como garantia a fiança prestada por pessoa idônea, qualificada no preâmbulo deste instrumento, que responderá solidariamente por todas as obrigações do LOCATÁRIO.`, { align: 'justify' });
    
    // Cláusula 9 - Rescisão
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 9ª - RESCISÃO', { underline: true });
    
    doc.font('Helvetica')
       .text(`O presente contrato poderá ser rescindido a qualquer tempo, por iniciativa de qualquer das partes, mediante notificação por escrito com antecedência mínima de 30 (trinta) dias, ou imediatamente, no caso de descumprimento de qualquer cláusula contratual.`, { align: 'justify' });
    
    // Cláusula 10 - Foro
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 10ª - FORO', { underline: true });
    
    doc.font('Helvetica')
       .text(`Fica eleito o foro da comarca onde se localiza o imóvel para dirimir quaisquer dúvidas ou controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`, { align: 'justify' });
    
    doc.moveDown();
    doc.text(`E por estarem justos e contratados, as partes assinam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença de 02 (duas) testemunhas, para que produza seus efeitos legais.`, { align: 'justify' });
    
    doc.moveDown(2);
  }
  
  private static addCommercialContractClauses(doc: PDFDocumentType, contract: Contract, property: Property) {
    const startDate = new Date(contract.startDate).toLocaleDateString('pt-BR');
    const endDate = new Date(contract.endDate).toLocaleDateString('pt-BR');
    const rentValue = (contract.rentValue/100).toFixed(2);
    
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text('CLÁUSULAS E CONDIÇÕES:');
    
    doc.font('Helvetica')
       .fontSize(11);
    
    // Cláusula 1 - Prazo
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 1ª - PRAZO', { underline: true });
    
    doc.font('Helvetica')
       .text(`A locação terá início em ${startDate} e término em ${endDate}, pelo período de ${contract.duration} meses. Ao término deste prazo, não havendo manifestação por escrito de qualquer das partes, o contrato será prorrogado por prazo indeterminado.`, { align: 'justify' });
    
    // Cláusula 2 - Valor e forma de pagamento
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 2ª - VALOR E FORMA DE PAGAMENTO', { underline: true });
    
    doc.font('Helvetica')
       .text(`O aluguel mensal é de R$ ${rentValue} (${this.valueToWords(Number(rentValue))}), a ser pago até o dia ${contract.paymentDay} de cada mês, mediante depósito bancário ou outra forma a ser acordada entre as partes.`, { align: 'justify' })
       .text(`Parágrafo Único: O atraso no pagamento acarretará multa de 10% (dez por cento) sobre o valor do aluguel, além de juros de 1% (um por cento) ao mês, calculados pro rata die.`, { align: 'justify' });
    
    // Cláusula 3 - Reajuste
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 3ª - REAJUSTE', { underline: true });
    
    doc.font('Helvetica')
       .text(`O valor do aluguel será reajustado anualmente, de acordo com a variação do Índice Geral de Preços - Mercado (IGP-M) da Fundação Getúlio Vargas, ou outro índice que vier a substituí-lo.`, { align: 'justify' });
    
    // Cláusula 4 - Destinação do imóvel
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 4ª - DESTINAÇÃO DO IMÓVEL', { underline: true });
    
    doc.font('Helvetica')
       .text(`O imóvel objeto deste contrato destina-se exclusivamente para fins comerciais, não podendo o LOCATÁRIO utilizá-lo para outros fins sem prévia autorização por escrito do LOCADOR.`, { align: 'justify' });
    
    // Cláusula 5 - Despesas e encargos
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 5ª - DESPESAS E ENCARGOS', { underline: true });
    
    doc.font('Helvetica')
       .text(`Correrão por conta do LOCATÁRIO as despesas com taxas de luz, água, telefone, gás, condomínio e outras taxas que incidam ou venham a incidir sobre o imóvel, bem como o Imposto Predial e Territorial Urbano (IPTU).`, { align: 'justify' });
    
    // Cláusula 6 - Conservação e restituição do imóvel
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 6ª - CONSERVAÇÃO E RESTITUIÇÃO DO IMÓVEL', { underline: true });
    
    doc.font('Helvetica')
       .text(`O LOCATÁRIO obriga-se a conservar o imóvel e a devolvê-lo, ao final da locação, em perfeitas condições de uso e conservação, inclusive com pintura nova, responsabilizando-se pelos danos que porventura sobrevierem ao imóvel durante a locação.`, { align: 'justify' });
    
    // Cláusula 7 - Benfeitorias
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 7ª - BENFEITORIAS', { underline: true });
    
    doc.font('Helvetica')
       .text(`O LOCATÁRIO não poderá fazer no imóvel, sem prévia autorização por escrito do LOCADOR, benfeitorias ou modificações de qualquer natureza. As benfeitorias úteis ou voluptuárias realizadas pelo LOCATÁRIO, ainda que autorizadas, não serão indenizáveis e ficarão incorporadas ao imóvel.`, { align: 'justify' });
    
    // Adicionando mais cláusulas se necessário, verificando o espaço disponível na página
    if (doc.y > 700) {
      doc.addPage();
    }
    
    // Cláusula 8 - Garantia
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 8ª - GARANTIA', { underline: true });
    
    doc.font('Helvetica')
       .text(`Para garantir as obrigações assumidas neste contrato, o LOCATÁRIO apresenta como garantia a fiança prestada por pessoa idônea, qualificada no preâmbulo deste instrumento, que responderá solidariamente por todas as obrigações do LOCATÁRIO.`, { align: 'justify' });
    
    // Cláusula 9 - Rescisão
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 9ª - RESCISÃO', { underline: true });
    
    doc.font('Helvetica')
       .text(`O presente contrato poderá ser rescindido a qualquer tempo, por iniciativa de qualquer das partes, mediante notificação por escrito com antecedência mínima de 30 (trinta) dias, ou imediatamente, no caso de descumprimento de qualquer cláusula contratual.`, { align: 'justify' });
    
    // Cláusula 10 - Cláusula específica para imóveis comerciais
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 10ª - ALVARÁ E LICENÇAS', { underline: true });
    
    doc.font('Helvetica')
       .text(`É de responsabilidade do LOCATÁRIO a obtenção de todos os alvarás, licenças e autorizações necessárias para o funcionamento de seu estabelecimento comercial, isentando o LOCADOR de qualquer responsabilidade neste sentido.`, { align: 'justify' });
    
    // Cláusula 11 - Foro
    doc.moveDown();
    doc.font('Helvetica-Bold')
       .text('CLÁUSULA 11ª - FORO', { underline: true });
    
    doc.font('Helvetica')
       .text(`Fica eleito o foro da comarca onde se localiza o imóvel para dirimir quaisquer dúvidas ou controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`, { align: 'justify' });
    
    doc.moveDown();
    doc.text(`E por estarem justos e contratados, as partes assinam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença de 02 (duas) testemunhas, para que produza seus efeitos legais.`, { align: 'justify' });
    
    doc.moveDown(2);
  }
  
  private static addSignatureFields(doc: PDFDocumentType) {
    const currentY = doc.y;
    
    // Adicionar nova página se necessário
    if (currentY > 650) {
      doc.addPage();
    }
    
    const date = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    doc.text(`Local e data: ________________________, ${date}`, { align: 'center' });
    
    doc.moveDown(2);
    
    // Assinaturas em duas colunas
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / 2;
    
    // Locador
    doc.text('__________________________________', doc.page.margins.left, doc.y, { width: colWidth, align: 'center' });
    doc.text('LOCADOR', doc.page.margins.left, doc.y + 20, { width: colWidth, align: 'center' });
    
    // Locatário
    doc.text('__________________________________', doc.page.margins.left + colWidth, doc.y - 20, { width: colWidth, align: 'center' });
    doc.text('LOCATÁRIO', doc.page.margins.left + colWidth, doc.y, { width: colWidth, align: 'center' });
    
    doc.moveDown(4);
    
    // Testemunhas
    doc.text('Testemunhas:', { align: 'left' });
    doc.moveDown();
    
    // Testemunha 1
    doc.text('1. __________________________________', doc.page.margins.left, doc.y, { width: colWidth, align: 'left' });
    doc.text('Nome: _____________________________', doc.page.margins.left, doc.y + 20, { width: colWidth, align: 'left' });
    doc.text('CPF: ______________________________', doc.page.margins.left, doc.y + 20, { width: colWidth, align: 'left' });
    
    // Testemunha 2
    doc.text('2. __________________________________', doc.page.margins.left + colWidth, doc.y - 40, { width: colWidth, align: 'left' });
    doc.text('Nome: _____________________________', doc.page.margins.left + colWidth, doc.y - 20, { width: colWidth, align: 'left' });
    doc.text('CPF: ______________________________', doc.page.margins.left + colWidth, doc.y, { width: colWidth, align: 'left' });
  }


}

/**
 * Funções auxiliares para download de PDFs
 */
export const downloadPDF = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};