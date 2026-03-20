import type { Order, OrderItem } from '../../../types';

type CombinedOrderItem = {
  signature: string;
  itemNameSnapshot: string;
  unitPrice: string;
  quantity: number;
  customisations: Record<string, string>;
};

export type GroupedOrder = {
  groupKey: string;
  user: Order['user'];
  status: Order['status'];
  orderType: Order['orderType'];
  orders: Order[];
  orderCount: number;
  combinedTotal: number;
  combinedItems: CombinedOrderItem[];
  latestCreatedAt: string;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `"${k}":${stableStringify(v)}`);

  return `{${entries.join(',')}}`;
}

function buildItemSignature(item: OrderItem): string {
  const customisations = item.customisations ?? {};
  return `${item.itemNameSnapshot}|${item.unitPrice}|${stableStringify(customisations)}`;
}

export function groupOrders(orders: Order[]): GroupedOrder[] {
  const groups = new Map<string, GroupedOrder>();

  for (const order of orders) {
    const userId = order.user?.id ?? order.userId ?? `unknown-user-${order.id}`;
    const user = order.user ?? {
      id: userId,
      name: 'Unknown user',
      email: 'unknown@example.com',
    };
    const groupKey = `${userId}::${order.orderType}::${order.status}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupKey,
        user,
        status: order.status,
        orderType: order.orderType,
        orders: [],
        orderCount: 0,
        combinedTotal: 0,
        combinedItems: [],
        latestCreatedAt: order.createdAt,
      });
    }

    const group = groups.get(groupKey)!;
    group.orders.push(order);
    group.orderCount += 1;
    group.combinedTotal += Number(order.total);
    if (new Date(order.createdAt) > new Date(group.latestCreatedAt)) {
      group.latestCreatedAt = order.createdAt;
    }
  }

  for (const group of groups.values()) {
    const itemMap = new Map<string, CombinedOrderItem>();

    for (const order of group.orders) {
      for (const item of order.orderItems) {
        const signature = buildItemSignature(item);
        if (!itemMap.has(signature)) {
          itemMap.set(signature, {
            signature,
            itemNameSnapshot: item.itemNameSnapshot,
            unitPrice: item.unitPrice,
            quantity: 0,
            customisations: item.customisations ?? {},
          });
        }

        const combined = itemMap.get(signature)!;
        combined.quantity += item.quantity;
      }
    }

    group.combinedItems = Array.from(itemMap.values()).sort((a, b) =>
      a.itemNameSnapshot.localeCompare(b.itemNameSnapshot),
    );
    group.orders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime(),
  );
}
