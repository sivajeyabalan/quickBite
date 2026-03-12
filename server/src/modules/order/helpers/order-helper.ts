import { PrismaClient } from '@prisma/client';

export async function generateOrderNumber(prisma: PrismaClient | any): Promise<string> {
  const count = await prisma.order.count();
  const next = count + 1;
  return `QB-${String(next).padStart(4, '0')}`;
}