import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type SeedCategory = {
  name: string;
  description: string;
  displayOrder: number;
};

type SeedMenuItem = {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  prepTimeMins: number;
  isAvailable: boolean;
  categoryName: string;
  customisationOptions?: {
    size?: string[];
    addOns?: string[];
    spiceLevel?: string[];
    breadType?: string[];
    dip?: string[];
  };
};

const categories: SeedCategory[] = [
  {
    name: 'Burgers',
    description: 'Juicy handcrafted burgers with premium toppings.',
    displayOrder: 1,
  },
  {
    name: 'Wraps',
    description: 'Loaded wraps rolled fresh to order.',
    displayOrder: 2,
  },
  {
    name: 'Pizzas',
    description: 'Stone-baked pizzas with bold flavors.',
    displayOrder: 3,
  },
  {
    name: 'Sides',
    description: 'Crispy and snackable side items.',
    displayOrder: 4,
  },
  {
    name: 'Beverages',
    description: 'Refreshing hot and cold drinks.',
    displayOrder: 5,
  },
  {
    name: 'Desserts',
    description: 'Sweet treats to finish your meal.',
    displayOrder: 6,
  },
];

const menuItems: SeedMenuItem[] = [
  {
    name: 'Classic Chicken Burger',
    description: 'Crispy chicken fillet, lettuce, and house mayo in a toasted bun.',
    price: 199,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    prepTimeMins: 12,
    isAvailable: true,
    categoryName: 'Burgers',
    customisationOptions: {
      addOns: ['Cheese', 'Jalapeno', 'Extra Patty'],
      spiceLevel: ['Mild', 'Medium', 'Hot'],
    },
  },
  {
    name: 'Double Cheese Burger',
    description: 'Two grilled patties layered with cheddar, onions, and signature sauce.',
    price: 269,
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349',
    prepTimeMins: 14,
    isAvailable: true,
    categoryName: 'Burgers',
    customisationOptions: {
      addOns: ['Bacon', 'Caramelized Onion', 'Cheese Slice'],
      spiceLevel: ['Mild', 'Medium'],
    },
  },
  {
    name: 'Spicy Paneer Burger',
    description: 'Grilled paneer patty with mint chutney, onions, and slaw.',
    price: 229,
    imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360',
    prepTimeMins: 13,
    isAvailable: true,
    categoryName: 'Burgers',
    customisationOptions: {
      addOns: ['Cheese', 'Extra Paneer'],
      spiceLevel: ['Medium', 'Hot', 'Extra Hot'],
    },
  },
  {
    name: 'Smoky BBQ Burger',
    description: 'Flame-grilled patty topped with smoky BBQ glaze and onion rings.',
    price: 289,
    imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add',
    prepTimeMins: 15,
    isAvailable: true,
    categoryName: 'Burgers',
    customisationOptions: {
      addOns: ['Cheddar', 'Fried Egg', 'Extra BBQ Sauce'],
      spiceLevel: ['Mild', 'Medium'],
    },
  },
  {
    name: 'Mushroom Swiss Burger',
    description: 'Sauteed mushrooms, swiss-style cheese, and pepper aioli.',
    price: 299,
    imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b',
    prepTimeMins: 14,
    isAvailable: true,
    categoryName: 'Burgers',
    customisationOptions: {
      addOns: ['Extra Mushrooms', 'Cheese', 'Pickles'],
    },
  },
  {
    name: 'Crispy Chicken Wrap',
    description: 'Crunchy chicken strips, shredded lettuce, and chipotle mayo.',
    price: 189,
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f',
    prepTimeMins: 10,
    isAvailable: true,
    categoryName: 'Wraps',
    customisationOptions: {
      breadType: ['Whole Wheat', 'Regular'],
      addOns: ['Cheese', 'Extra Chicken'],
      spiceLevel: ['Mild', 'Medium', 'Hot'],
    },
  },
  {
    name: 'Peri Peri Paneer Wrap',
    description: 'Soft tortilla packed with peri peri paneer and crunchy veggies.',
    price: 199,
    imageUrl: 'https://images.unsplash.com/photo-1643566541431-a3e5933270f1',
    prepTimeMins: 11,
    isAvailable: true,
    categoryName: 'Wraps',
    customisationOptions: {
      breadType: ['Whole Wheat', 'Regular'],
      addOns: ['Extra Paneer', 'Olives'],
      spiceLevel: ['Medium', 'Hot', 'Extra Hot'],
    },
  },
  {
    name: 'Falafel Hummus Wrap',
    description: 'Crispy falafel with creamy hummus, pickled veggies, and tahini.',
    price: 179,
    imageUrl: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d',
    prepTimeMins: 9,
    isAvailable: true,
    categoryName: 'Wraps',
    customisationOptions: {
      breadType: ['Whole Wheat', 'Regular'],
      addOns: ['Feta', 'Olives'],
    },
  },
  {
    name: 'Tandoori Chicken Wrap',
    description: 'Tandoori-spiced chicken, onion, and mint yogurt in a warm tortilla.',
    price: 219,
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950',
    prepTimeMins: 12,
    isAvailable: true,
    categoryName: 'Wraps',
    customisationOptions: {
      breadType: ['Whole Wheat', 'Regular'],
      addOns: ['Cheese', 'Extra Chicken'],
      spiceLevel: ['Mild', 'Medium', 'Hot'],
    },
  },
  {
    name: 'Veggie Supreme Wrap',
    description: 'A colorful mix of sauteed veggies, sauces, and cheddar.',
    price: 169,
    imageUrl: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c',
    prepTimeMins: 8,
    isAvailable: true,
    categoryName: 'Wraps',
    customisationOptions: {
      breadType: ['Whole Wheat', 'Regular'],
      addOns: ['Cheese', 'Jalapeno', 'Corn'],
    },
  },
  {
    name: 'Margherita Pizza',
    description: 'Classic tomato sauce, mozzarella, and fresh basil.',
    price: 299,
    imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3',
    prepTimeMins: 18,
    isAvailable: true,
    categoryName: 'Pizzas',
    customisationOptions: {
      size: ['Small', 'Medium', 'Large'],
      addOns: ['Extra Cheese', 'Olives', 'Mushrooms'],
    },
  },
  {
    name: 'Farmhouse Pizza',
    description: 'Loaded with bell peppers, onions, corn, and mushrooms.',
    price: 349,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
    prepTimeMins: 20,
    isAvailable: true,
    categoryName: 'Pizzas',
    customisationOptions: {
      size: ['Small', 'Medium', 'Large'],
      addOns: ['Paneer', 'Extra Cheese', 'Jalapeno'],
    },
  },
  {
    name: 'Pepperoni Pizza',
    description: 'A crowd favorite topped with spicy pepperoni and mozzarella.',
    price: 399,
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e',
    prepTimeMins: 19,
    isAvailable: true,
    categoryName: 'Pizzas',
    customisationOptions: {
      size: ['Small', 'Medium', 'Large'],
      addOns: ['Extra Pepperoni', 'Cheese Burst'],
    },
  },
  {
    name: 'Paneer Tikka Pizza',
    description: 'Indian-style pizza with marinated paneer and onion.',
    price: 379,
    imageUrl: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e',
    prepTimeMins: 20,
    isAvailable: true,
    categoryName: 'Pizzas',
    customisationOptions: {
      size: ['Small', 'Medium', 'Large'],
      addOns: ['Extra Paneer', 'Olives', 'Cheese'],
      spiceLevel: ['Mild', 'Medium', 'Hot'],
    },
  },
  {
    name: 'BBQ Chicken Pizza',
    description: 'Tangy BBQ sauce base with grilled chicken and red onions.',
    price: 419,
    imageUrl: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c',
    prepTimeMins: 21,
    isAvailable: true,
    categoryName: 'Pizzas',
    customisationOptions: {
      size: ['Small', 'Medium', 'Large'],
      addOns: ['Extra Chicken', 'Cheese Burst'],
    },
  },
  {
    name: 'French Fries',
    description: 'Golden, crispy potato fries with house seasoning.',
    price: 119,
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f',
    prepTimeMins: 6,
    isAvailable: true,
    categoryName: 'Sides',
    customisationOptions: {
      dip: ['Mayo', 'Chipotle', 'Cheese Dip'],
    },
  },
  {
    name: 'Peri Peri Fries',
    description: 'French fries tossed in spicy peri peri seasoning.',
    price: 139,
    imageUrl: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d',
    prepTimeMins: 7,
    isAvailable: true,
    categoryName: 'Sides',
    customisationOptions: {
      dip: ['Garlic Mayo', 'Cheese Dip'],
      spiceLevel: ['Medium', 'Hot'],
    },
  },
  {
    name: 'Chicken Nuggets',
    description: 'Bite-sized crispy chicken nuggets with dipping sauce.',
    price: 169,
    imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710',
    prepTimeMins: 9,
    isAvailable: true,
    categoryName: 'Sides',
    customisationOptions: {
      dip: ['BBQ', 'Mustard', 'Chipotle'],
    },
  },
  {
    name: 'Garlic Bread',
    description: 'Toasted garlic bread with butter and herbs.',
    price: 129,
    imageUrl: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c',
    prepTimeMins: 8,
    isAvailable: true,
    categoryName: 'Sides',
    customisationOptions: {
      addOns: ['Cheese', 'Chili Flakes'],
    },
  },
  {
    name: 'Cheese Nachos',
    description: 'Crunchy nachos topped with warm cheese sauce and jalapenos.',
    price: 189,
    imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d',
    prepTimeMins: 10,
    isAvailable: true,
    categoryName: 'Sides',
    customisationOptions: {
      addOns: ['Salsa', 'Guacamole', 'Extra Cheese'],
    },
  },
  {
    name: 'Coke',
    description: 'Classic chilled cola served in a 300ml bottle.',
    price: 60,
    imageUrl: 'https://images.unsplash.com/photo-1580910051074-3eb694886505',
    prepTimeMins: 2,
    isAvailable: true,
    categoryName: 'Beverages',
  },
  {
    name: 'Lemon Iced Tea',
    description: 'Refreshing lemon-flavored iced tea over ice.',
    price: 89,
    imageUrl: 'https://images.unsplash.com/photo-1497534446932-c925b458314e',
    prepTimeMins: 3,
    isAvailable: true,
    categoryName: 'Beverages',
  },
  {
    name: 'Cold Coffee',
    description: 'Creamy blended cold coffee topped with cocoa dust.',
    price: 129,
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735',
    prepTimeMins: 5,
    isAvailable: true,
    categoryName: 'Beverages',
    customisationOptions: {
      addOns: ['Whipped Cream', 'Extra Shot'],
    },
  },
  {
    name: 'Mango Smoothie',
    description: 'Thick mango smoothie made with ripe mango pulp.',
    price: 149,
    imageUrl: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc',
    prepTimeMins: 6,
    isAvailable: true,
    categoryName: 'Beverages',
  },
  {
    name: 'Masala Chai',
    description: 'Indian spiced tea brewed fresh with milk and herbs.',
    price: 49,
    imageUrl: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f',
    prepTimeMins: 4,
    isAvailable: true,
    categoryName: 'Beverages',
  },
  {
    name: 'Chocolate Brownie',
    description: 'Rich chocolate brownie with a fudgy center.',
    price: 99,
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c',
    prepTimeMins: 5,
    isAvailable: true,
    categoryName: 'Desserts',
    customisationOptions: {
      addOns: ['Ice Cream Scoop', 'Chocolate Sauce'],
    },
  },
  {
    name: 'New York Cheesecake',
    description: 'Creamy cheesecake with a buttery biscuit base.',
    price: 179,
    imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad',
    prepTimeMins: 6,
    isAvailable: true,
    categoryName: 'Desserts',
    customisationOptions: {
      addOns: ['Berry Compote', 'Chocolate Drizzle'],
    },
  },
  {
    name: 'Vanilla Ice Cream',
    description: 'Classic vanilla ice cream served chilled.',
    price: 79,
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb',
    prepTimeMins: 3,
    isAvailable: true,
    categoryName: 'Desserts',
    customisationOptions: {
      addOns: ['Sprinkles', 'Chocolate Syrup'],
    },
  },
  {
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with molten chocolate core.',
    price: 159,
    imageUrl: 'https://images.unsplash.com/photo-1617305855058-336d66f3f6a5',
    prepTimeMins: 9,
    isAvailable: true,
    categoryName: 'Desserts',
    customisationOptions: {
      addOns: ['Vanilla Ice Cream', 'Caramel Sauce'],
    },
  },
  {
    name: 'Gulab Jamun (2 pcs)',
    description: 'Soft milk-solid dumplings soaked in saffron sugar syrup.',
    price: 89,
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7',
    prepTimeMins: 4,
    isAvailable: true,
    categoryName: 'Desserts',
  },
];

async function main() {
  const categoryByName = new Map<string, string>();

  for (const category of categories) {
    const upsertedCategory = await prisma.category.upsert({
      where: { name: category.name },
      update: {
        description: category.description,
        displayOrder: category.displayOrder,
        isActive: true,
      },
      create: {
        name: category.name,
        description: category.description,
        displayOrder: category.displayOrder,
        isActive: true,
      },
    });

    categoryByName.set(category.name, upsertedCategory.id);
  }

  const categoryIds = Array.from(categoryByName.values());
  await prisma.menuItem.deleteMany({
    where: { categoryId: { in: categoryIds } },
  });

  await prisma.menuItem.createMany({
    data: menuItems.map((item) => ({
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      prepTimeMins: item.prepTimeMins,
      isAvailable: item.isAvailable,
      customisationOptions: item.customisationOptions,
      categoryId: categoryByName.get(item.categoryName)!,
    })),
  });

  const totalItems = await prisma.menuItem.count({
    where: { categoryId: { in: categoryIds } },
  });

  console.log(`Seed complete: ${categories.length} categories and ${totalItems} menu items inserted.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
