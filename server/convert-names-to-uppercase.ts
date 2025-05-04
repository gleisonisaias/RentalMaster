// Script para converter todos os nomes de proprietários, inquilinos e imóveis para letras maiúsculas
import { db } from './db';
import { owners, tenants, properties } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Função para converter todos os nomes para maiúsculas no banco de dados
 */
export async function convertAllNamesToUppercase() {
  console.log('Iniciando a conversão de nomes para maiúsculas...');

  try {
    // Converter nomes de proprietários
    console.log('Convertendo nomes de proprietários...');
    const allOwners = await db.select().from(owners);
    let ownersUpdated = 0;
    
    for (const owner of allOwners) {
      if (owner.name && owner.name !== owner.name.toUpperCase()) {
        await db.update(owners)
          .set({ name: owner.name.toUpperCase() })
          .where(eq(owners.id, owner.id));
        ownersUpdated++;
      }
    }
    
    console.log(`${ownersUpdated} proprietários atualizados.`);

    // Converter nomes de inquilinos
    console.log('Convertendo nomes de inquilinos...');
    const allTenants = await db.select().from(tenants);
    let tenantsUpdated = 0;
    
    for (const tenant of allTenants) {
      if (tenant.name && tenant.name !== tenant.name.toUpperCase()) {
        await db.update(tenants)
          .set({ name: tenant.name.toUpperCase() })
          .where(eq(tenants.id, tenant.id));
        tenantsUpdated++;
      }

      // Converter nome do fiador e cônjuge do fiador, se existir
      // Nota: Como o campo guarantor é JSON, precisamos verificar a estrutura
      if (tenant.guarantor) {
        let needsUpdate = false;
        const guarantor = typeof tenant.guarantor === 'string' 
          ? JSON.parse(tenant.guarantor) 
          : tenant.guarantor;
        
        if (guarantor.name && guarantor.name !== guarantor.name.toUpperCase()) {
          guarantor.name = guarantor.name.toUpperCase();
          needsUpdate = true;
        }
        
        if (guarantor.spouseName && guarantor.spouseName !== guarantor.spouseName.toUpperCase()) {
          guarantor.spouseName = guarantor.spouseName.toUpperCase();
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await db.update(tenants)
            .set({ guarantor })
            .where(eq(tenants.id, tenant.id));
        }
      }
    }
    
    console.log(`${tenantsUpdated} inquilinos atualizados.`);

    // Converter nomes de imóveis
    console.log('Convertendo nomes de imóveis...');
    const allProperties = await db.select().from(properties);
    let propertiesUpdated = 0;
    
    for (const property of allProperties) {
      if (property.name && property.name !== property.name.toUpperCase()) {
        await db.update(properties)
          .set({ name: property.name.toUpperCase() })
          .where(eq(properties.id, property.id));
        propertiesUpdated++;
      }
    }
    
    console.log(`${propertiesUpdated} imóveis atualizados.`);
    console.log('Conversão de nomes para maiúsculas concluída com sucesso!');
    
    return {
      ownersUpdated,
      tenantsUpdated,
      propertiesUpdated,
      total: ownersUpdated + tenantsUpdated + propertiesUpdated
    };
  } catch (error) {
    console.error('Erro durante a conversão de nomes para maiúsculas:', error);
    throw error;
  }
}