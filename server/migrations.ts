import { sql } from "drizzle-orm";
import { db } from "./db";

export async function runMigrations() {
  console.log("Executando migrações de banco de dados...");

  try {
    // Verificar e adicionar coluna is_restored na tabela payments
    await addColumnIfNotExists('payments', 'is_restored', 'BOOLEAN NOT NULL DEFAULT FALSE');
    
    // Verificar e adicionar coluna was_restored na tabela deleted_payments
    await addColumnIfNotExists('deleted_payments', 'was_restored', 'BOOLEAN NOT NULL DEFAULT FALSE');
    
    // Verificar e adicionar coluna installment_number na tabela payments
    await addColumnIfNotExists('payments', 'installment_number', 'INTEGER NOT NULL DEFAULT 0');
    
    // Verificar e adicionar coluna installment_number na tabela deleted_payments
    await addColumnIfNotExists('deleted_payments', 'installment_number', 'INTEGER NOT NULL DEFAULT 0');
    
    // Verificar e adicionar coluna first_payment_date na tabela contracts
    await addColumnIfNotExists('contracts', 'first_payment_date', 'DATE');
    
    // Verificar e adicionar coluna type na tabela contract_templates
    await addColumnIfNotExists('contract_templates', 'type', 'TEXT NOT NULL DEFAULT \'residential\'');
    
    // Verificar e adicionar coluna rg na tabela owners
    await addColumnIfNotExists('owners', 'rg', 'TEXT');
    
    // Remover a restrição NOT NULL da coluna payment_day na tabela contracts
    try {
      console.log("Alterando restrição NOT NULL da coluna payment_day na tabela contracts...");
      await db.execute(sql`
        ALTER TABLE contracts ALTER COLUMN payment_day DROP NOT NULL;
      `);
      console.log("Restrição NOT NULL removida com sucesso da coluna payment_day.");
    } catch (err) {
      console.error("Erro ao alterar restrição da coluna payment_day:", err);
    }
    
    // Atualizar os modelos existentes para definir tipo com base no conteúdo
    try {
      // Verificar primeiro se os modelos já têm um tipo definido
      const result = await db.execute(sql`
        UPDATE contract_templates 
        SET type = 'commercial' 
        WHERE content ILIKE '%CONTRATO DE LOCAÇÃO COMERCIAL%'
          OR content ILIKE '%IMÓVEL COMERCIAL%';
      `);
      console.log("Tipos dos modelos de contrato atualizados com sucesso.");
    } catch (err) {
      console.error("Erro ao atualizar tipos dos modelos de contrato:", err);
    }
    
    console.log("Migrações concluídas com sucesso!");
  } catch (error) {
    console.error("Erro ao executar migrações:", error);
    throw error;
  }
}

async function addColumnIfNotExists(table: string, column: string, columnDefinition: string) {
  // Verificar se a coluna já existe na tabela
  const columnCheck = await db.execute(sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = ${table} 
    AND column_name = ${column}
  `);
  
  if (columnCheck.rows.length === 0) {
    console.log(`Adicionando coluna ${column} à tabela ${table}...`);
    await db.execute(sql`
      ALTER TABLE ${sql.raw(table)} 
      ADD COLUMN IF NOT EXISTS ${sql.raw(column)} ${sql.raw(columnDefinition)}
    `);
    console.log(`Coluna ${column} adicionada com sucesso à tabela ${table}.`);
  } else {
    console.log(`Coluna ${column} já existe na tabela ${table}.`);
  }
}