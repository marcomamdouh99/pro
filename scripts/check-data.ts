import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany();
  console.log('Branches:', JSON.stringify(branches, null, 2));
  
  const ingredients = await prisma.ingredient.findMany();
  console.log('\nIngredients:', JSON.stringify(ingredients, null, 2));
  
  const inventory = await prisma.branchInventory.findMany({
    include: { branch: true, ingredient: true }
  });
  console.log('\nInventory:', JSON.stringify(inventory, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
