import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const models = ['Supplier', 'PurchaseOrder', 'PurchaseOrderItem', 'InventoryTransfer', 'InventoryTransferItem', 'WasteLog', 'LoyaltyTransaction', 'Notification'];
  
  for (const model of models) {
    try {
      const count = await (prisma as any)[model.toLowerCase()].count();
      console.log(`✓ ${model}: ${count} records`);
    } catch (error) {
      console.log(`✗ ${model}: Not found`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
