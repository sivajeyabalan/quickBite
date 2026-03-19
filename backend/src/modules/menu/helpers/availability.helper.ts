import { MenuItem } from '@prisma/client';

/**
 * Check if a menu item is available for ordering
 * Factors: is86d, stockQty, time window, isAvailable flag
 */
export function isItemOrderable(item: MenuItem): {
  available: boolean;
  reason?: string;
} {
  if (!item.isAvailable) {
    return { available: false, reason: 'Item is not available' };
  }

  if (item.is86d) {
    return { available: false, reason: 'Item is 86\'d (out)' };
  }

  if (item.stockQty >= 0 && item.stockQty === 0) {
    return { available: false, reason: 'Item is out of stock' };
  }

  const now = new Date();

  if (item.availableFrom && now < item.availableFrom) {
    return {
      available: false,
      reason: `Available from ${item.availableFrom.toLocaleTimeString()}`,
    };
  }

  if (item.availableTo && now >= item.availableTo) {
    return {
      available: false,
      reason: `No longer available after ${item.availableTo.toLocaleTimeString()}`,
    };
  }

  return { available: true };
}

/**
 * Decrement stock for an item (if using stock tracking)
 */
export function shouldDecrementStock(item: MenuItem): boolean {
  return item.stockQty >= 0;
}
