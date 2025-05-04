/**
 * Serviço para processamento e aplicação de modelos de contrato
 * Permite a substituição de variáveis com dados reais para geração de documentos
 */
import { storage } from './storage';
import { ContractTemplate, Owner, Tenant, Property, Contract } from "@shared/schema";

/**
 * Função utilitária para formatar datas adequadamente nos contratos gerados
 * Ajustada para o fuso horário de Brasília (GMT-3)
 */
function formatDateSafe(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  // Criar data a partir da string de data 
  const date = new Date(dateString);
  
  // IMPORTANTE: Subtrair 1 dia para ajustar o problema de fuso horário
  date.setDate(date.getDate() - 1);
  
  // Aplicar correção para o fuso horário de Brasília (GMT-3)
  // Definir para meio-dia UTC para garantir consistência
  date.setUTCHours(12, 0, 0, 0);
  
  // Formatar a data no formato brasileiro
  return date.toLocaleDateString('pt-BR', options);
}

interface Guarantor {
  name?: string;
  document?: string;
  rg?: string;
  nationality?: string;
  profession?: string;
  maritalStatus?: string;
  phone?: string;
  email?: string;
  address?: any;
  spouseName?: string;
}

interface TemplateData {
  owner: Owner;
  tenant: Tenant & { guarantor?: Guarantor | string };
  property: Property;
  contract: Contract;
  guarantor?: Guarantor;
}

/**
 * Processa o conteúdo de um modelo substituindo as variáveis pelos dados reais
 * @param templateContent O conteúdo do modelo com variáveis no formato {{variavel}}
 * @param data Os dados para substituir as variáveis
 * @returns O conteúdo processado com as variáveis substituídas
 */
async function processTemplateContent(templateContent: string, data: TemplateData): Promise<string> {
  let result = templateContent;
  
  /**
   * Função para processar tags condicionais no formato "Prefixo: {{tag}}"
   * onde o prefixo só aparece se o valor da tag existe
   * @param result O conteúdo atual do template
   * @param regex Expressão regular para encontrar o padrão "Prefixo: {{tag}}"
   * @param value O valor que substituirá a tag
   * @returns O conteúdo processado
   */
  /**
   * Função simplificada para processar tags condicionais
   * Esta versão não tenta encontrar o prefixo no texto, apenas substitui a tag
   * e adiciona o prefixo se o valor existir
   * @param result O conteúdo atual do template
   * @param prefix O prefixo a ser adicionado (ex: "CPF: ")
   * @param tagName O nome da tag (ex: "owner.document") sem as chaves
   * @param value O valor que substituirá a tag
   * @returns O conteúdo processado
   */
  function processConditionalTag(result: string, prefix: string, tagName: string, value: any): string {
    // Formar a tag completa com as chaves
    const fullTag = `{{${tagName}}}`;
    
    // Se o valor existir, substituir a tag pelo prefixo+valor
    if (value) {
      // Log para diagnóstico
      console.log(`Processando tag "${fullTag}" adicionando prefixo "${prefix}" e valor "${value}"`);
      
      // Substituir diretamente a tag pelo prefixo+valor
      return result.replace(new RegExp(fullTag, 'g'), `${prefix} ${value}`);
    } else {
      // Se o valor não existir, remover a tag completamente
      console.log(`Removendo tag "${fullTag}" por não ter valor`);
      return result.replace(new RegExp(fullTag, 'g'), '');
    }
  }
  
  // Função para formatar um objeto de endereço como string
  function formatAddress(addressObj: any): string {
    if (!addressObj) return '';
    
    // Se o endereço é uma string JSON, converter para objeto
    let address = addressObj;
    if (typeof addressObj === 'string') {
      try {
        address = JSON.parse(addressObj);
      } catch (err) {
        return addressObj; // Se não for um JSON válido, retornar como está
      }
    }
    
    // Verificar se é um objeto válido com as propriedades necessárias
    if (typeof address !== 'object' || !address) return '';
    
    // Formatar o endereço completo
    return `${address.street || ''}, ${address.number || ''}${address.complement ? ', ' + address.complement : ''}, ${address.neighborhood || ''}, ${address.city || ''} - ${address.state || ''}, CEP: ${address.zipCode || ''}`;
  }

  // Processar variáveis do proprietário
  console.log('Processando dados do proprietário:', {
    id: data.owner.id,
    name: data.owner.name,
    document: data.owner.document,
    rg: data.owner.rg,
    profession: data.owner.profession
  });
  
  result = result.replace(/{{owner\.name}}/g, data.owner.name || '');
  
  // Processamento condicional para CPF do proprietário
  result = processConditionalTag(result, "CPF:", "owner.document", data.owner.document || '');
  
  // Substituição normal para as ocorrências simples da tag
  result = result.replace(/{{owner\.document}}/g, data.owner.document || '');
  
  // Processamento condicional para RG do proprietário
  result = processConditionalTag(result, "RG nº:", "owner.rg", data.owner.rg || '');
  
  // Processamento especial para o RG do proprietário (problemas relatados)
  const ownerRgTag = /{{owner\.rg}}/g;
  if (ownerRgTag.test(result)) {
    console.log('Tag {{owner.rg}} encontrada no template. Valor do RG:', data.owner.rg);
    result = result.replace(ownerRgTag, data.owner.rg || '');
    
    // Verificação extra para garantir que a substituição ocorreu
    if (/{{owner\.rg}}/.test(result)) {
      console.error('ERRO: A tag {{owner.rg}} ainda está presente após a substituição!');
    }
  }
  
  result = result.replace(/{{owner\.address}}/g, `Endereço: ${formatAddress(data.owner.address)}`);
  result = result.replace(/{{owner\.phone}}/g, data.owner.phone || '');
  result = result.replace(/{{owner\.email}}/g, data.owner.email || '');
  result = result.replace(/{{owner\.nationality}}/g, data.owner.nationality || '');
  result = result.replace(/{{owner\.profession}}/g, data.owner.profession || '');
  result = result.replace(/{{owner\.maritalStatus}}/g, data.owner.maritalStatus || '');
  
  // Processamento condicional para o cônjuge do proprietário
  result = processConditionalTag(result, "Cônjuge:", "owner.spouseName", data.owner.spouseName || '');
  
  // Tratar o caso especial do spouseName - remover completamente quando vazio
  if (data.owner.spouseName) {
    result = result.replace(/{{owner\.spouseName}}/g, data.owner.spouseName);
  } else {
    // Se não tiver cônjuge, remove a tag completamente
    result = result.replace(/{{owner\.spouseName}}/g, '');
  }

  // Processar variáveis do inquilino
  console.log('Processando dados do inquilino:', {
    id: data.tenant.id,
    name: data.tenant.name,
    document: data.tenant.document,
    rg: data.tenant.rg,
    profession: data.tenant.profession
  });
  
  result = result.replace(/{{tenant\.name}}/g, data.tenant.name || '');
  // Processamento condicional para CPF do inquilino
  result = processConditionalTag(result, "CPF:", "tenant.document", data.tenant.document || '');
  
  // Substituição normal para as ocorrências simples da tag
  result = result.replace(/{{tenant\.document}}/g, data.tenant.document || '');
  
  // Processamento condicional para RG do inquilino
  result = processConditionalTag(result, "RG nº:", "tenant.rg", data.tenant.rg || '');
  
  // Processamento especial para o RG do inquilino (problemas relatados)
  const tenantRgTag = /{{tenant\.rg}}/g;
  if (tenantRgTag.test(result)) {
    console.log('Tag {{tenant.rg}} encontrada no template. Valor do RG:', data.tenant.rg);
    result = result.replace(tenantRgTag, data.tenant.rg || '');
    
    // Verificação extra para garantir que a substituição ocorreu
    if (/{{tenant\.rg}}/.test(result)) {
      console.error('ERRO: A tag {{tenant.rg}} ainda está presente após a substituição!');
    }
  }
  
  result = result.replace(/{{tenant\.address}}/g, `Endereço: ${formatAddress(data.tenant.address)}`);
  result = result.replace(/{{tenant\.phone}}/g, data.tenant.phone || '');
  result = result.replace(/{{tenant\.email}}/g, data.tenant.email || '');
  result = result.replace(/{{tenant\.nationality}}/g, data.tenant.nationality || '');
  result = result.replace(/{{tenant\.profession}}/g, data.tenant.profession || '');
  result = result.replace(/{{tenant\.maritalStatus}}/g, data.tenant.maritalStatus || '');
  
  // Processamento condicional para o cônjuge do inquilino
  result = processConditionalTag(result, "Cônjuge:", "tenant.spouseName", data.tenant.spouseName || '');
  
  // Tratar o caso especial do spouseName - remover completamente quando vazio
  if (data.tenant.spouseName) {
    result = result.replace(/{{tenant\.spouseName}}/g, data.tenant.spouseName);
  } else {
    // Se não tiver cônjuge, remove a tag completamente
    result = result.replace(/{{tenant\.spouseName}}/g, '');
  }
  
  // Processar variáveis do fiador
  let guarantorData: Guarantor | null = null;
  
  // Verificar se os dados do fiador estão disponíveis
  if (data.guarantor) {
    guarantorData = data.guarantor;
  } else if (data.tenant.guarantor) {
    if (typeof data.tenant.guarantor === 'string') {
      try {
        guarantorData = JSON.parse(data.tenant.guarantor);
      } catch (err) {
        console.error('Erro ao fazer parse dos dados do fiador:', err);
      }
    } else {
      guarantorData = data.tenant.guarantor;
    }
  }
  
  if (guarantorData) {
    // Processamento condicional para o termo "Fiador"
    result = processConditionalTag(result, "Fiador:", "guarantor.name", guarantorData.name || '');
    
    // Tratar cada campo individualmente para remover valores vazios completamente
    if (guarantorData.name) {
      result = result.replace(/{{guarantor\.name}}/g, guarantorData.name);
    } else {
      result = result.replace(/{{guarantor\.name}}/g, '');
    }
    
    // Processamento condicional para CPF do fiador
    result = processConditionalTag(result, "CPF:", "guarantor.document", guarantorData.document || '');
    
    // Substituição normal para as ocorrências simples da tag
    if (guarantorData.document) {
      result = result.replace(/{{guarantor\.document}}/g, guarantorData.document);
    } else {
      result = result.replace(/{{guarantor\.document}}/g, '');
    }
    
    // Processamento condicional para RG do fiador
    result = processConditionalTag(result, "RG nº:", "guarantor.rg", guarantorData.rg || '');
    
    // Processamento especial para o RG do fiador (seguindo o mesmo padrão robusto)
    const guarantorRgTag = /{{guarantor\.rg}}/g;
    if (guarantorRgTag.test(result)) {
      console.log('Tag {{guarantor.rg}} encontrada no template. Valor do RG:', guarantorData.rg);
      result = result.replace(guarantorRgTag, guarantorData.rg || '');
      
      // Verificação extra para garantir que a substituição ocorreu
      if (/{{guarantor\.rg}}/.test(result)) {
        console.error('ERRO: A tag {{guarantor.rg}} ainda está presente após a substituição!');
      }
    }
    
    // Usar a mesma lógica de prefixo para o endereço do fiador
    if (guarantorData.address) {
      result = result.replace(/{{guarantor\.address}}/g, `Endereço: ${formatAddress(guarantorData.address)}`);
    } else {
      result = result.replace(/{{guarantor\.address}}/g, '');
    }
    
    if (guarantorData.phone) {
      result = result.replace(/{{guarantor\.phone}}/g, `Telefone: ${guarantorData.phone}`);
    } else {
      result = result.replace(/{{guarantor\.phone}}/g, '');
    }
    
    if (guarantorData.email) {
      result = result.replace(/{{guarantor\.email}}/g, `Email: ${guarantorData.email}`);
    } else {
      result = result.replace(/{{guarantor\.email}}/g, '');
    }
    
    if (guarantorData.nationality) {
      result = result.replace(/{{guarantor\.nationality}}/g, `Nacionalidade: ${guarantorData.nationality}`);
    } else {
      result = result.replace(/{{guarantor\.nationality}}/g, '');
    }
    
    if (guarantorData.profession) {
      result = result.replace(/{{guarantor\.profession}}/g, `Profissão: ${guarantorData.profession}`);
    } else {
      result = result.replace(/{{guarantor\.profession}}/g, '');
    }
    
    if (guarantorData.maritalStatus) {
      result = result.replace(/{{guarantor\.maritalStatus}}/g, `Estado Civil: ${guarantorData.maritalStatus}`);
    } else {
      result = result.replace(/{{guarantor\.maritalStatus}}/g, '');
    }
    
    // Processamento condicional para o cônjuge do fiador
    result = processConditionalTag(result, "Cônjuge:", "guarantor.spouseName", guarantorData.spouseName || '');
    
    // Tratar o caso especial do spouseName do fiador, se existir
    if (guarantorData.spouseName) {
      result = result.replace(/{{guarantor\.spouseName}}/g, guarantorData.spouseName);
    } else {
      result = result.replace(/{{guarantor\.spouseName}}/g, '');
    }
  } else {
    // Se não houver dados do fiador, substituir as tags por vazio
    result = result.replace(/{{guarantor\.[^}]+}}/g, '');
  }
  
  // Processar variáveis do imóvel
  console.log('Processando dados da propriedade:', data.property);
  result = result.replace(/{{property\.name}}/g, data.property.name || '');
  result = result.replace(/{{property\.address}}/g, `Endereço: ${formatAddress(data.property.address)}`);
  result = result.replace(/{{property\.area}}/g, data.property.area?.toString() || '');
  result = result.replace(/{{property\.description}}/g, data.property.description || '');
  result = result.replace(/{{property\.type}}/g, data.property.type || '');
  result = result.replace(/{{property\.bedrooms}}/g, data.property.bedrooms?.toString() || '');
  result = result.replace(/{{property\.bathrooms}}/g, data.property.bathrooms?.toString() || '');
  
  // Dados de concessionárias (água e energia)
  result = result.replace(/{{property\.waterCompany}}/g, (data.property as any).waterCompany || '');
  result = result.replace(/{{property\.waterAccountNumber}}/g, (data.property as any).waterAccountNumber || '');
  result = result.replace(/{{property\.electricityCompany}}/g, (data.property as any).electricityCompany || '');
  result = result.replace(/{{property\.electricityAccountNumber}}/g, (data.property as any).electricityAccountNumber || '');
  
  // Processar variáveis do contrato
  console.log("Dados do contrato para substituição:", data.contract);
  result = result.replace(/{{contract\.duration}}/g, data.contract.duration?.toString() || '');
  result = result.replace(/{{contract\.startDate}}/g, formatDateSafe(data.contract.startDate) || '');
  result = result.replace(/{{contract\.endDate}}/g, formatDateSafe(data.contract.endDate) || '');
  result = result.replace(/{{contract\.rentValue}}/g, data.contract.rentValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '');
  result = result.replace(/{{contract\.number}}/g, data.contract.id?.toString() || '');
  result = result.replace(/{{contract\.status}}/g, data.contract.status || '');
  result = result.replace(/{{contract\.observations}}/g, data.contract.observations || '');
  
  // Cada tag presente no template
  const contractTags = result.match(/{{contract\.[^}]+}}/g) || [];
  if (contractTags.length > 0) {
    console.log("Tags de contrato encontradas no template:", contractTags);
  }
  
  // Função para converter valor em números para extenso em Português
  function valorPorExtenso(valor: number): string {
    if (valor <= 0) return 'zero';
    
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    const milhares = ['', 'mil', 'milhão', 'bilhão', 'trilhão'];
    const milharesPlural = ['', 'mil', 'milhões', 'bilhões', 'trilhões'];
    
    // Função para converter grupos de 3 dígitos
    function converterGrupo(n: number): string {
      if (n === 0) return '';
      if (n === 100) return 'cem';
      
      let resultado = '';
      
      // Centenas
      if (n >= 100) {
        resultado += centenas[Math.floor(n / 100)];
        n %= 100;
        if (n !== 0) resultado += ' e ';
      }
      
      // Dezenas e unidades
      if (n < 20) {
        if (n > 0) resultado += unidades[n];
      } else {
        resultado += dezenas[Math.floor(n / 10)];
        n %= 10;
        if (n !== 0) resultado += ' e ' + unidades[n];
      }
      
      return resultado;
    }
    
    let result = '';
    let escala = 0;
    let valorRestante = valor;
    
    // Processar cada grupo de 3 dígitos
    while (valorRestante > 0) {
      const grupo = valorRestante % 1000;
      valorRestante = Math.floor(valorRestante / 1000);
      
      if (grupo !== 0) {
        const textoGrupo = converterGrupo(grupo);
        const indicador = grupo === 1 ? milhares[escala] : milharesPlural[escala];
        
        if (result !== '') {
          result = textoGrupo + ' ' + indicador + (grupo > 1 && escala > 0 ? '' : ' e ') + result;
        } else {
          result = textoGrupo + (escala > 0 ? ' ' + indicador : '');
        }
      }
      
      escala++;
    }
    
    return result;
  }

  // Data atual em formato longo (para tags {{DATA_LONGA}})
  const dataHoje = new Date();
  const opcoesDataLonga: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  };
  const dataLonga = dataHoje.toLocaleDateString('pt-BR', opcoesDataLonga);
  result = result.replace(/{{DATA_LONGA}}/g, dataLonga);
  
  // Data atual formato curto (para tags {{DATA_ATUAL}})
  const dataAtual = dataHoje.toLocaleDateString('pt-BR');
  result = result.replace(/{{DATA_ATUAL}}/g, dataAtual);
  
  // Hora atual (para tags {{HORA}})
  const hora = dataHoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  result = result.replace(/{{HORA}}/g, hora);

  // Processar qualquer campo personalizado contido no objeto do contrato
  if (data.contract) {
    const contract = data.contract as any;
    
    // Dia de pagamento
    console.log('Verificando campo paymentDay:', contract);
    if ('paymentDay' in contract) {
      console.log(`Substituindo tag {{contract.paymentDay}} com valor: ${contract.paymentDay}`);
      result = result.replace(/{{contract\.paymentDay}}/g, contract.paymentDay?.toString() || '');
    } else if (contract.firstPaymentDate) {
      // Extrair o dia da data do primeiro pagamento
      const firstPaymentDate = new Date(contract.firstPaymentDate);
      const paymentDay = firstPaymentDate.getDate();
      console.log(`Usando dia da data do primeiro pagamento: ${paymentDay}`);
      result = result.replace(/{{contract\.paymentDay}}/g, paymentDay.toString());
    } else {
      console.log('Campo paymentDay não encontrado no contrato e não há firstPaymentDate');
    }
    
    // ID do contrato
    result = result.replace(/{{contract\.id}}/g, contract.id?.toString() || '');
    
    // Tipo de contrato
    result = result.replace(/{{contract\.type}}/g, contract.type || 'residencial');
    
    // Para contratos de renovação, adicionar tags para o contrato original
    if (contract.isRenewal && contract.originalContractId) {
      console.log(`Processando tags de contrato original para renovação. ID original: ${contract.originalContractId}`);
      result = result.replace(/{{contract\.originalContractId}}/g, contract.originalContractId.toString());
      
      // Buscar informações do contrato original
      try {
        const originalContract = await storage.getContract(contract.originalContractId);
        if (originalContract) {
          console.log('Dados do contrato original encontrados:', originalContract);
          // Adicionar data de início e término do contrato original
          result = result.replace(/{{contract\.originalStartDate}}/g, formatDateSafe(originalContract.startDate) || '');
          result = result.replace(/{{contract\.originalEndDate}}/g, formatDateSafe(originalContract.endDate) || '');
          
          // Adicionar período completo formatado do contrato original
          const periodFormatted = `${formatDateSafe(originalContract.startDate)} a ${formatDateSafe(originalContract.endDate)}`;
          result = result.replace(/{{contract\.originalPeriod}}/g, periodFormatted);
        } else {
          console.log(`Contrato original #${contract.originalContractId} não encontrado`);
          // Substituir as tags por valores vazios se o contrato original não for encontrado
          result = result.replace(/{{contract\.originalStartDate}}/g, '');
          result = result.replace(/{{contract\.originalEndDate}}/g, '');
          result = result.replace(/{{contract\.originalPeriod}}/g, '');
        }
      } catch (error) {
        console.error('Erro ao buscar contrato original:', error);
        // Substituir as tags por valores vazios em caso de erro
        result = result.replace(/{{contract\.originalStartDate}}/g, '');
        result = result.replace(/{{contract\.originalEndDate}}/g, '');
        result = result.replace(/{{contract\.originalPeriod}}/g, '');
      }
    } else {
      // Se não for renovação, substituir as tags por valores vazios
      result = result.replace(/{{contract\.originalContractId}}/g, '');
      result = result.replace(/{{contract\.originalStartDate}}/g, '');
      result = result.replace(/{{contract\.originalEndDate}}/g, '');
      result = result.replace(/{{contract\.originalPeriod}}/g, '');
    }
    
    // Valor do aluguel por extenso
    if (contract.rentValue) {
      const valorExtenso = valorPorExtenso(contract.rentValue);
      result = result.replace(/{{contract\.rentValueInWords}}/g, valorExtenso + ' reais');
    }
    
    // Data do primeiro pagamento
    if (contract.firstPaymentDate) {
      result = result.replace(/{{contract\.firstPaymentDate}}/g, formatDateSafe(contract.firstPaymentDate) || '');
    }
    
    // Valor do depósito
    if ('depositValue' in contract && contract.depositValue) {
      result = result.replace(/{{contract\.depositValue}}/g, contract.depositValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    }
  }
  
  // NÃO limpar tags de contrato não substituídas - manter as tags originais
  
  // Verificação final para garantir que todas as tags de RG foram substituídas
  // Esta é uma garantia extra para o problema reportado
  if (/{{(owner|tenant)\.rg}}/g.test(result)) {
    console.error('ALERTA: Ainda existem tags de RG não substituídas no documento!');
    console.log('Fazendo uma última tentativa de substituição forçada');
    
    // Forçar substituição de qualquer tag de RG que ainda exista
    result = result.replace(/{{owner\.rg}}/g, data.owner.rg || '');
    result = result.replace(/{{tenant\.rg}}/g, data.tenant.rg || '');
  }
  
  // Finalmente, processar a numeração de páginas (após todas as outras substituições)
  // Contar ocorrências da tag {{PAGINA}}
  const pageTagCount = (result.match(/{{PAGINA}}/g) || []).length;
  const totalPages = Math.max(1, pageTagCount);
  
  // Substituir as tags {{PAGINA}} com o formato "Página X de Y"
  if (pageTagCount > 0) {
    console.log(`Substituindo ${pageTagCount} tags de página no documento...`);
    let pageCounter = 1;
    result = result.replace(/{{PAGINA}}/g, () => {
      const pageText = `Página ${pageCounter} de ${totalPages}`;
      console.log(`Adicionando ${pageText}`);
      pageCounter++;
      return `<div style="position: absolute; bottom: 1cm; right: 1.5cm; font-size: 10pt;">${pageText}</div>`;
    });
  }

  return result;
}

/**
 * Obtém e processa um modelo de contrato com dados reais
 * @param templateId O ID do modelo de contrato a ser usado
 * @param data Os dados para substituir as variáveis
 * @returns O conteúdo do modelo processado com as variáveis substituídas
 */
export async function getProcessedTemplate(templateId: number, data: TemplateData): Promise<string> {
  const template = await storage.getContractTemplate(templateId);
  
  if (!template) {
    throw new Error(`Modelo de contrato com ID ${templateId} não encontrado`);
  }
  
  return await processTemplateContent(template.content, data);
}

/**
 * Obtém e processa um modelo de contrato baseado no tipo com dados reais
 * @param type O tipo de contrato ('residential' ou 'commercial')
 * @param data Os dados para substituir as variáveis
 * @returns O conteúdo do modelo processado com as variáveis substituídas
 */
export async function getProcessedTemplateByType(type: 'residential' | 'commercial', data: TemplateData): Promise<string> {
  const templates = await storage.getContractTemplates();
  
  // Filtrar os modelos ativos por tipo
  const filteredTemplates = templates.filter(t => t.isActive && t.type === type);
  
  if (filteredTemplates.length === 0) {
    throw new Error(`Nenhum modelo de contrato ativo do tipo ${type} encontrado`);
  }
  
  // Pegar o primeiro modelo ativo do tipo especificado
  const template = filteredTemplates[0];
  
  return await processTemplateContent(template.content, data);
}

/**
 * Obtém todos os modelos de contrato ativos
 * @returns Lista de modelos de contrato ativos
 */
export async function getActiveTemplates(): Promise<ContractTemplate[]> {
  const templates = await storage.getContractTemplates();
  return templates.filter(t => t.isActive);
}

/**
 * Obtém todos os modelos de contrato ativos de um tipo específico
 * @param type O tipo de contrato ('residential' ou 'commercial')
 * @returns Lista de modelos de contrato ativos do tipo especificado
 */
export async function getActiveTemplatesByType(type: 'residential' | 'commercial'): Promise<ContractTemplate[]> {
  const templates = await storage.getContractTemplates();
  return templates.filter(t => t.isActive && t.type === type);
}