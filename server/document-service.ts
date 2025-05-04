/**
 * Serviço para manipulação de documentos de inquilinos
 * Permite upload, download e gerenciamento de documentos
 */

import { Request, Response } from 'express';
import { storage } from './storage';
import * as path from 'path';
import * as fs from 'fs';
import * as Busboy from 'busboy';
import { TenantDocument, tenantDocuments } from '@shared/schema';
import { db } from './db';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// Diretório para armazenar os documentos
const uploadDir = path.join(process.cwd(), 'uploads');

// Verifica se o diretório de uploads existe, e se não, o cria
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Diretório de uploads criado: ${uploadDir}`);
}

/**
 * Manipula o upload de documentos para inquilinos com abordagem simplificada
 */
export async function uploadTenantDocument(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  const tenantId = Number(req.params.tenantId);
  
  if (isNaN(tenantId)) {
    return res.status(400).json({ message: 'ID de inquilino inválido' });
  }
  
  // Verifica se o inquilino existe
  const tenant = await storage.getTenant(tenantId);
  if (!tenant) {
    return res.status(404).json({ message: 'Inquilino não encontrado' });
  }

  // Criar uma instância do Busboy
  const busboyInstance = Busboy.default({ headers: req.headers });

  let documentType = '';
  let description = '';
  let fileSize = 0;
  let fileName = '';
  let fileBuffer: Buffer | null = null;
  let fileExtension = '';
  
  // Processar campos de texto
  busboyInstance.on('field', (fieldname, val) => {
    if (fieldname === 'documentType') {
      documentType = val;
    } else if (fieldname === 'description') {
      description = val;
    }
  });
  
  // Processar arquivos - campo 'file' é o nome do campo no FormData do frontend
  busboyInstance.on('file', (fieldname, file, info) => {
    console.log('Recebendo arquivo no campo:', fieldname);
    fileName = info.filename;
    fileExtension = path.extname(fileName);
    
    const chunks: any[] = [];
    
    file.on('data', (chunk) => {
      chunks.push(chunk);
      fileSize += chunk.length;
    });
    
    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
      console.log(`Arquivo recebido: ${fileName}, tamanho: ${fileSize} bytes`);
    });
  });
  
  // Finalizar processamento
  busboyInstance.on('finish', async () => {
    try {
      if (!fileBuffer) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado' });
      }
      
      if (!documentType) {
        return res.status(400).json({ message: 'Tipo de documento não especificado' });
      }
      
      // Gerar nome de arquivo único
      const uniqueId = randomBytes(16).toString('hex');
      const safeFileName = `${Date.now()}_${uniqueId}${fileExtension}`;
      const filePath = path.join(uploadDir, safeFileName);
      
      // Salvar arquivo no disco
      fs.writeFileSync(filePath, fileBuffer);
      
      // Salvar registro no banco de dados
      // @ts-ignore - Ignoramos erros de tipagem temporariamente
      const document = await db.insert(tenantDocuments).values({
        tenantId,
        documentType,
        description: description || null,
        fileName,
        storedFileName: safeFileName,
        fileSize,
        fileType: fileExtension.substring(1) || 'unknown',
        uploadedAt: new Date(),
        uploadedBy: req.user ? (req.user as any).id : null,
        isActive: true
      }).returning();
      
      console.log('Documento salvo com sucesso:', document[0]);
      
      res.status(201).json(document[0]);
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
      res.status(500).json({ message: 'Erro ao salvar o documento' });
    }
  });
  
  // Manipular erros
  busboyInstance.on('error', (err) => {
    console.error('Erro no processamento do Busboy:', err);
    res.status(500).json({ message: 'Erro ao processar o upload' });
  });
  
  // Iniciar processamento
  req.pipe(busboyInstance);
}

/**
 * Lista todos os documentos de um inquilino
 */
export async function getTenantDocuments(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  const tenantId = Number(req.params.tenantId);
  
  if (isNaN(tenantId)) {
    return res.status(400).json({ message: 'ID de inquilino inválido' });
  }
  
  try {
    // Buscar apenas documentos ativos
    const documents = await db.select()
      .from(tenantDocuments)
      .where(and(
        eq(tenantDocuments.tenantId, tenantId),
        eq(tenantDocuments.isActive, true)
      ));
    
    res.json(documents);
  } catch (error) {
    console.error('Erro ao buscar documentos do inquilino:', error);
    res.status(500).json({ message: 'Erro ao buscar documentos do inquilino' });
  }
}

/**
 * Baixa um documento específico de um inquilino
 */
export async function downloadTenantDocument(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  const documentId = Number(req.params.documentId);
  
  if (isNaN(documentId)) {
    return res.status(400).json({ message: 'ID de documento inválido' });
  }
  
  try {
    // Buscar o documento no banco de dados
    const [document] = await db.select()
      .from(tenantDocuments)
      .where(and(
        eq(tenantDocuments.id, documentId),
        eq(tenantDocuments.isActive, true)
      ));
    
    if (!document) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }
    
    // Caminho completo do arquivo
    const filePath = path.join(uploadDir, document.storedFileName);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Arquivo não encontrado no servidor' });
    }
    
    // Enviar o arquivo como download
    res.download(filePath, document.fileName);
  } catch (error) {
    console.error('Erro ao baixar documento:', error);
    res.status(500).json({ message: 'Erro ao baixar documento' });
  }
}

/**
 * Remove (desativa) um documento específico de um inquilino
 */
export async function deleteTenantDocument(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  const documentId = Number(req.params.documentId);
  
  if (isNaN(documentId)) {
    return res.status(400).json({ message: 'ID de documento inválido' });
  }
  
  try {
    // Verificar se o documento existe
    const [document] = await db.select()
      .from(tenantDocuments)
      .where(eq(tenantDocuments.id, documentId));
    
    if (!document) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }
    
    // Marcar o documento como inativo (exclusão lógica)
    await db.update(tenantDocuments)
      .set({ isActive: false })
      .where(eq(tenantDocuments.id, documentId));
    
    res.status(200).json({ message: 'Documento removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover documento:', error);
    res.status(500).json({ message: 'Erro ao remover documento' });
  }
}