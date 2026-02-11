import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a second branch
  const branch = await prisma.branch.upsert({
    where: { branchName: 'Second Branch' },
    update: {},
    create: {
      branchName: 'Second Branch',
      licenseKey: 'LIC-002-2024',
      licenseExpiresAt: new Date('2025-12-31'),
      isActive: true,
    },
  });
  
  console.log('Created branch:', branch);
  
  // Get all ingredients
  const ingredients = await prisma.ingredient.findMany();
  console.log('Found', ingredients.length, 'ingredients');
  
  // Create inventory for the new branch
  for (const ingredient of ingredients) {
    const inventory = await prisma.branchInventory.upsert({
      where: {
        branchId_ingredientId: {
          branchId: branch.id,
          ingredientId: ingredient.id,
        },
      },
      update: {},
      create: {
        branchId: branch.id,
        ingredientId: ingredient.id,
        currentStock: Math.floor(Math.random() * 100) + 10, // Random stock 10-110
      },
    });
    console.log(`Created inventory for ${ingredient.name}: ${inventory.currentStock}`);
  }
  
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
