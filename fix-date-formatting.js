import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho para o arquivo a ser corrigido
const filePath = path.join(__dirname, 'server/pdf-service.ts');

// Ler o conteúdo do arquivo
let content = fs.readFileSync(filePath, 'utf8');

// Substituir referências problemáticas para new Date() com getDateDaySafe()
// 1. Substituir para obter o dia do mês da data de primeiro pagamento
content = content.replace(
  /new Date\(contract\.firstPaymentDate\)\.getDate\(\)/g,
  'getDateDaySafe(contract.firstPaymentDate)'
);

// 2. Substituir outras referências a firstPaymentDate para usar setHours
content = content.replace(
  /const firstPaymentDay = new Date\(newContract\.firstPaymentDate\)\.getDate\(\);/g,
  'const firstPaymentDay = getDateDaySafe(newContract.firstPaymentDate);'
);

// 3. Substituir datas de vencimento para usar formatDateSafe
content = content.replace(
  /const dueDate1 = new Date\(payment1\.dueDate\);/g,
  'const dueDate1 = new Date(payment1.dueDate);\n        dueDate1.setHours(12, 0, 0, 0); // Garantir que a data seja padronizada'
);

content = content.replace(
  /new Date\(a\.dueDate\)\.getTime\(\) - new Date\(b\.dueDate\)\.getTime\(\)/g,
  '(() => { const dateA = new Date(a.dueDate); const dateB = new Date(b.dueDate); dateA.setHours(12, 0, 0, 0); dateB.setHours(12, 0, 0, 0); return dateA.getTime() - dateB.getTime(); })()'
);

// 4. Outras datas
content = content.replace(
  /new Date\(payment\.dueDate\)\.toLocaleDateString\('pt-BR'\)/g,
  'formatDateSafe(payment.dueDate)'
);

content = content.replace(
  /const startDate = new Date\(newContract\.startDate\);/g,
  'const startDate = new Date(newContract.startDate);\n  startDate.setHours(12, 0, 0, 0); // Garantir que a data seja padronizada'
);

content = content.replace(
  /const newContractStartDate = new Date\(newContract\.startDate\);/g,
  'const newContractStartDate = new Date(newContract.startDate);\n  newContractStartDate.setHours(12, 0, 0, 0); // Garantir que a data seja padronizada'
);

content = content.replace(
  /const newContractEndDate = new Date\(newContract\.endDate\);/g,
  'const newContractEndDate = new Date(newContract.endDate);\n  newContractEndDate.setHours(12, 0, 0, 0); // Garantir que a data seja padronizada'
);

// Escrever o conteúdo atualizado de volta no arquivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('Correções de formatação de data aplicadas com sucesso!');