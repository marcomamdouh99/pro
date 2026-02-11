import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
  console.log('Checking which models exist...\n');
  
  const models: any = [
    'Supplier', 'PurchaseOrder', 'PurchaseOrderItem', 
    'InventoryTransfer', 'InventoryTransferItem', 
    'WasteLog', 'LoyaltyTransaction', 'Notification'
  ];
  
  for (const model of models) {
    try {
      const result = await (prisma as any)[model.toLowerCase()].count();
      console.log(`✓ ${model}: ${result} records`);
    } catch (e) {
      console.log(`✗ ${model}: Does not exist`);
    }
}

checkTables()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error('Error:', err);
    prisma.$disconnect();
  });
