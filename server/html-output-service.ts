/**
 * Serviço para gerar saída HTML em vez de PDF
 * Isso permitirá uma formatação mais precisa do texto
 */
import { Request, Response } from "express";
import { db } from "./db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import * as contractTemplatesService from "./contract-templates-service";

/**
 * Gera um documento HTML para contratos residenciais
 */
export async function generateResidentialContractHTML(req: Request, res: Response) {
  try {
    const contractId = parseInt(req.params.id);
    if (isNaN(contractId)) {
      return res.status(400).send("ID de contrato inválido");
    }

    // Buscar dados do contrato
    const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, contractId));
    if (!contract) {
      return res.status(404).send("Contrato não encontrado");
    }

    // Buscar dados relacionados
    const [owner] = await db.select().from(schema.owners).where(eq(schema.owners.id, contract.ownerId));
    const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, contract.tenantId));
    const [property] = await db.select().from(schema.properties).where(eq(schema.properties.id, contract.propertyId));

    if (!owner || !tenant || !property) {
      return res.status(404).send("Dados relacionados ao contrato não encontrados");
    }

    // Se um ID de modelo específico foi fornecido, usá-lo
    let processedTemplate;
    
    // Adicionar logs para depuração
    console.log('Gerando contrato residencial HTML para:', {
      contractId,
      ownerData: {
        id: owner.id,
        name: owner.name,
        document: owner.document,
        rg: owner.rg // Verificar se o RG está presente
      },
      tenantData: {
        id: tenant.id,
        name: tenant.name, 
        document: tenant.document,
        rg: tenant.rg // Verificar se o RG está presente
      }
    });
    
    if (req.query.templateId) {
      const templateId = parseInt(req.query.templateId as string);
      if (isNaN(templateId)) {
        return res.status(400).send("ID de modelo inválido");
      }
      
      // Usar timestamp para evitar cache
      processedTemplate = await contractTemplatesService.getProcessedTemplate(
        templateId,
        { 
          owner: owner as any,
          tenant: tenant as any, 
          property: property as any, 
          contract: { ...contract, _timestamp: Date.now() } as any // Adicionar timestamp para evitar cache
        }
      );
    } else {
      // Caso contrário, usar o modelo padrão para o tipo
      // Usar timestamp para evitar cache
      processedTemplate = await contractTemplatesService.getProcessedTemplateByType(
        'residential',
        { 
          owner: owner as any,
          tenant: tenant as any, 
          property: property as any, 
          contract: { ...contract, _timestamp: Date.now() } as any // Adicionar timestamp para evitar cache
        }
      );
    }

    // Preparar o HTML completo com estilos CSS embutidos para garantir a formatação
    const htmlOutput = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contrato de Locação - ${tenant.name}</title>
      <style>
        @media print {
          body { 
            font-size: 12pt; 
            margin: 0;
            padding: 0;
          }
          .no-print { display: none; }
          @page { 
            margin: 0; 
            size: auto;
          }
          .content {
            padding: 0;
            margin: 0;
          }
        }
        
        body {
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.5;
          margin: 0;
          padding: 0;
          color: #000;
          max-width: 210mm; /* Aproximadamente tamanho A4 */
          margin-left: auto;
          margin-right: auto;
        }
        
        .controls {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #0066cc;
          padding: 10px;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 1000;
        }
        
        .controls button {
          background: white;
          color: #0066cc;
          border: none;
          padding: 8px 15px;
          margin: 0 5px;
          border-radius: 3px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .content {
          padding: 1.5cm;
          background-color: white;
          box-sizing: border-box;
          position: relative;
          min-height: 29.7cm; /* Altura mínima A4 */
        }
        
        h1, h2, h3 {
          text-align: center;
          margin: 15px 0;
        }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-justify { text-align: justify; }
        
        .bold { font-weight: bold; }
        .italic { font-style: italic; }
        .underline { text-decoration: underline; }
        
        .color-yellow { color: #ffff00; background-color: #333; } /* Fundo escuro para texto amarelo */
        .color-red { color: #ff0000; }
        .color-blue { color: #0000ff; }
        .color-green { color: #00ff00; background-color: #333; } /* Fundo escuro para texto verde */
      </style>
    </head>
    <body>
      <div class="controls no-print">
        <button onclick="window.print()">Imprimir</button>
        <button onclick="window.close()">Fechar</button>
      </div>
      
      <div class="content">
        ${processedTemplate}
      </div>
      
      <script>
        // Script para preservar formatações específicas do ReactQuill
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('.ql-align-center').forEach(function(el) {
            el.classList.add('text-center');
          });
          
          document.querySelectorAll('.ql-align-right').forEach(function(el) {
            el.classList.add('text-right');
          });
          
          document.querySelectorAll('.ql-align-justify').forEach(function(el) {
            el.classList.add('text-justify');
          });
          
          document.querySelectorAll('.ql-bold, strong, b').forEach(function(el) {
            el.classList.add('bold');
          });
          
          document.querySelectorAll('.ql-italic, em, i').forEach(function(el) {
            el.classList.add('italic');
          });
          
          document.querySelectorAll('.ql-underline, u').forEach(function(el) {
            el.classList.add('underline');
          });
          
          // Cores específicas do Quill
          document.querySelectorAll('.ql-color-yellow, [style*="color: yellow"], [style*="color:#ffff00"]').forEach(function(el) {
            el.classList.add('color-yellow');
          });
          
          document.querySelectorAll('.ql-color-red, [style*="color: red"], [style*="color:#ff0000"]').forEach(function(el) {
            el.classList.add('color-red');
          });
          
          document.querySelectorAll('.ql-color-blue, [style*="color: blue"], [style*="color:#0000ff"]').forEach(function(el) {
            el.classList.add('color-blue');
          });
          
          document.querySelectorAll('.ql-color-green, [style*="color: green"], [style*="color:#00ff00"]').forEach(function(el) {
            el.classList.add('color-green');
          });
        });
      </script>
    </body>
    </html>
    `;

    // Enviar resposta como HTML
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="contrato_${contractId}.html"`);
    return res.send(htmlOutput);
  } catch (error) {
    console.error('Erro ao gerar documento HTML:', error);
    return res.status(500).send('Erro ao gerar o documento HTML');
  }
}

/**
 * Gera um documento HTML para contratos comerciais
 */
export async function generateCommercialContractHTML(req: Request, res: Response) {
  try {
    const contractId = parseInt(req.params.id);
    if (isNaN(contractId)) {
      return res.status(400).send("ID de contrato inválido");
    }

    // Buscar dados do contrato
    const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, contractId));
    if (!contract) {
      return res.status(404).send("Contrato não encontrado");
    }

    // Buscar dados relacionados
    const [owner] = await db.select().from(schema.owners).where(eq(schema.owners.id, contract.ownerId));
    const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, contract.tenantId));
    const [property] = await db.select().from(schema.properties).where(eq(schema.properties.id, contract.propertyId));

    if (!owner || !tenant || !property) {
      return res.status(404).send("Dados relacionados ao contrato não encontrados");
    }

    // Se um ID de modelo específico foi fornecido, usá-lo
    let processedTemplate;
    
    // Adicionar logs para depuração
    console.log('Gerando contrato comercial HTML para:', {
      contractId,
      ownerData: {
        id: owner.id,
        name: owner.name,
        document: owner.document,
        rg: owner.rg // Verificar se o RG está presente
      },
      tenantData: {
        id: tenant.id,
        name: tenant.name, 
        document: tenant.document,
        rg: tenant.rg // Verificar se o RG está presente
      }
    });
    
    if (req.query.templateId) {
      const templateId = parseInt(req.query.templateId as string);
      if (isNaN(templateId)) {
        return res.status(400).send("ID de modelo inválido");
      }
      
      // Usar timestamp para evitar cache
      processedTemplate = await contractTemplatesService.getProcessedTemplate(
        templateId,
        { 
          owner: owner as any,
          tenant: tenant as any, 
          property: property as any, 
          contract: { ...contract, _timestamp: Date.now() } as any // Adicionar timestamp para evitar cache
        }
      );
    } else {
      // Caso contrário, usar o modelo padrão para o tipo
      // Usar timestamp para evitar cache
      processedTemplate = await contractTemplatesService.getProcessedTemplateByType(
        'commercial',
        { 
          owner: owner as any,
          tenant: tenant as any, 
          property: property as any, 
          contract: { ...contract, _timestamp: Date.now() } as any // Adicionar timestamp para evitar cache
        }
      );
    }

    // Usar o mesmo template HTML que para contratos residenciais
    const htmlOutput = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contrato Comercial - ${tenant.name}</title>
      <style>
        @media print {
          body { 
            font-size: 12pt; 
            margin: 0;
            padding: 0;
          }
          .no-print { display: none; }
          @page { 
            margin: 0; 
            size: auto;
          }
          .content {
            padding: 0;
            margin: 0;
          }
        }
        
        body {
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.5;
          margin: 0;
          padding: 0;
          color: #000;
          max-width: 210mm; /* Aproximadamente tamanho A4 */
          margin-left: auto;
          margin-right: auto;
        }
        
        .controls {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #0066cc;
          padding: 10px;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 1000;
        }
        
        .controls button {
          background: white;
          color: #0066cc;
          border: none;
          padding: 8px 15px;
          margin: 0 5px;
          border-radius: 3px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .content {
          padding: 1.5cm;
          background-color: white;
          box-sizing: border-box;
          position: relative;
          min-height: 29.7cm; /* Altura mínima A4 */
        }
        
        h1, h2, h3 {
          text-align: center;
          margin: 15px 0;
        }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-justify { text-align: justify; }
        
        .bold { font-weight: bold; }
        .italic { font-style: italic; }
        .underline { text-decoration: underline; }
        
        .color-yellow { color: #ffff00; background-color: #333; } /* Fundo escuro para texto amarelo */
        .color-red { color: #ff0000; }
        .color-blue { color: #0000ff; }
        .color-green { color: #00ff00; background-color: #333; } /* Fundo escuro para texto verde */
      </style>
    </head>
    <body>
      <div class="controls no-print">
        <button onclick="window.print()">Imprimir</button>
        <button onclick="window.close()">Fechar</button>
      </div>
      
      <div class="content">
        ${processedTemplate}
      </div>
      
      <script>
        // Script para preservar formatações específicas do ReactQuill
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('.ql-align-center').forEach(function(el) {
            el.classList.add('text-center');
          });
          
          document.querySelectorAll('.ql-align-right').forEach(function(el) {
            el.classList.add('text-right');
          });
          
          document.querySelectorAll('.ql-align-justify').forEach(function(el) {
            el.classList.add('text-justify');
          });
          
          document.querySelectorAll('.ql-bold, strong, b').forEach(function(el) {
            el.classList.add('bold');
          });
          
          document.querySelectorAll('.ql-italic, em, i').forEach(function(el) {
            el.classList.add('italic');
          });
          
          document.querySelectorAll('.ql-underline, u').forEach(function(el) {
            el.classList.add('underline');
          });
          
          // Cores específicas do Quill
          document.querySelectorAll('.ql-color-yellow, [style*="color: yellow"], [style*="color:#ffff00"]').forEach(function(el) {
            el.classList.add('color-yellow');
          });
          
          document.querySelectorAll('.ql-color-red, [style*="color: red"], [style*="color:#ff0000"]').forEach(function(el) {
            el.classList.add('color-red');
          });
          
          document.querySelectorAll('.ql-color-blue, [style*="color: blue"], [style*="color:#0000ff"]').forEach(function(el) {
            el.classList.add('color-blue');
          });
          
          document.querySelectorAll('.ql-color-green, [style*="color: green"], [style*="color:#00ff00"]').forEach(function(el) {
            el.classList.add('color-green');
          });
        });
      </script>
    </body>
    </html>
    `;

    // Enviar resposta como HTML
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="contrato_comercial_${contractId}.html"`);
    return res.send(htmlOutput);
  } catch (error) {
    console.error('Erro ao gerar documento HTML:', error);
    return res.status(500).send('Erro ao gerar o documento HTML');
  }
}