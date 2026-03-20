import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import type { Order } from '../types';

export const PENDING_REFUND_COUNT_QUERY_KEY = ['admin-refund-pending-count'];

export function usePendingRefundCount(enabled = true) {
  return useQuery({
    queryKey: PENDING_REFUND_COUNT_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get('/orders');
      const orders: Order[] = res.data.data ?? res.data;
      return orders.filter(order => order.payment?.status === 'REFUND_PENDING').length;
    },
    enabled,
    refetchInterval: 30_000,
  });
}
