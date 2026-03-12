import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create categories
  const starters = await prisma.category.upsert({
    where: { name: 'Starters' },
    update: {},
    create: { name: 'Starters', description: 'Light bites to begin', displayOrder: 1 },
  });

  const mains = await prisma.category.upsert({
    where: { name: 'Mains' },
    update: {},
    create: { name: 'Mains', description: 'Hearty main courses', displayOrder: 2 },
  });

  const desserts = await prisma.category.upsert({
    where: { name: 'Desserts' },
    update: {},
    create: { name: 'Desserts', description: 'Sweet endings', displayOrder: 3 },
  });

  // Seed menu items
  const items = [
    {
      name: 'Garlic Bread', price: '3.99', prepTimeMins: 8,
      categoryId: starters.id,
      customisationOptions: { extras: ['cheese', 'herbs'] },
    },
    {
      name: 'Soup of the Day', price: '5.50', prepTimeMins: 5,
      categoryId: starters.id,
      customisationOptions: { sizes: ['small', 'large'] },
    },
    {
      name: 'Spring Rolls', price: '6.99', prepTimeMins: 12,
      categoryId: starters.id,
      customisationOptions: { dips: ['sweet chili', 'soy sauce'] },
    },
    {
      name: 'Grilled Chicken Burger', price: '12.99', prepTimeMins: 20,
      categoryId: mains.id,
      customisationOptions: {
        sizes: ['regular', 'large'],
        extras: ['bacon', 'extra cheese', 'avocado'],
        remove: ['lettuce', 'tomato', 'onion'],
      },
    },
    {
      name: 'Margherita Pizza', price: '11.50', prepTimeMins: 25,
      categoryId: mains.id,
      customisationOptions: {
        sizes: ['9 inch', '12 inch'],
        extras: ['extra mozzarella', 'olives', 'mushrooms'],
      },
    },
    {
      name: 'Pasta Arrabiata', price: '10.99', prepTimeMins: 18,
      categoryId: mains.id,
      customisationOptions: {
        extras: ['parmesan', 'chili flakes'],
        remove: ['garlic'],
      },
    },
    {
      name: 'Grilled Salmon', price: '15.99', prepTimeMins: 22,
      categoryId: mains.id,
      customisationOptions: { sides: ['rice', 'fries', 'salad'] },
    },
    {
      name: 'Beef Tacos (3pcs)', price: '13.50', prepTimeMins: 15,
      categoryId: mains.id,
      customisationOptions: {
        extras: ['sour cream', 'guacamole'],
        remove: ['onion', 'cilantro'],
      },
    },
    {
      name: 'Veggie Stir Fry', price: '9.99', prepTimeMins: 15,
      categoryId: mains.id,
      customisationOptions: { extras: ['tofu', 'extra noodles'] },
    },
    {
      name: 'Chocolate Lava Cake', price: '6.99', prepTimeMins: 12,
      categoryId: desserts.id,
      customisationOptions: { extras: ['vanilla ice cream', 'whipped cream'] },
    },
    {
      name: 'Cheesecake', price: '5.99', prepTimeMins: 5,
      categoryId: desserts.id,
      customisationOptions: { flavours: ['strawberry', 'blueberry', 'plain'] },
    },
    {
      name: 'Tiramisu', price: '6.50', prepTimeMins: 5,
      categoryId: desserts.id,
      customisationOptions: {},
    },
  ];

  await prisma.menuItem.createMany({ data: items, skipDuplicates: true });

  console.log('✅ Seeding complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());