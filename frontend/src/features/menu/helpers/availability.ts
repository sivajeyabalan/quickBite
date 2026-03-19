import type { MenuItem } from "../../../types";

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

  if (item.availableFrom) {
    const from = new Date(item.availableFrom);
    if (now < from) {
      return {
        available: false,
        reason: `Available from ${from.toLocaleTimeString()}`,
      };
    }
  }

  if (item.availableTo) {
    const to = new Date(item.availableTo);
    if (now >= to) {
      return {
        available: false,
        reason: `No longer available after ${to.toLocaleTimeString()}`,
      };
    }
  }

  return { available: true };
}

export function getStockStatus(item: MenuItem): string {
  if (item.stockQty === -1) return '';
  if (item.stockQty <= 0) return 'Out of Stock';
  if (item.stockQty <= 5) return `Only ${item.stockQty} left`;
  return '';
}

export function optimizeMenuImage(
  imageUrl: string | undefined,
  width = 480,
  height = 320,
): string | undefined {
  if (!imageUrl) return imageUrl;
  if (!imageUrl.includes('res.cloudinary.com')) return imageUrl;

  return imageUrl.replace(
    '/upload/',
    `/upload/f_auto,q_auto,c_fill,w_${width},h_${height}/`,
  );
}
