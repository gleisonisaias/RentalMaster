/**
 * Formata um valor numérico para moeda brasileira (R$)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata uma data no formato ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/YYYY)
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Converte uma data do formato brasileiro (DD/MM/YYYY) para o formato ISO (YYYY-MM-DD)
 */
export function parseDate(brDate: string): string {
  if (!brDate) return '';
  const [day, month, year] = brDate.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Formata o status do contrato para exibição
 */
export function formatContractStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'ativo': 'Ativo',
    'pendente': 'Agendado',
    'encerrado': 'Encerrado'
  };
  return statusMap[status] || status;
}