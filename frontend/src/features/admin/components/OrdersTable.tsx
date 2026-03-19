import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import type { Order, OrderStatus } from '../../../types';
import Spinner from '../../../components/ui/Spinner';
import { useSocket } from '../../../hooks/useSocket';
import { PENDING_REFUND_COUNT_QUERY_KEY } from '../../../hooks/usePendingRefundCount';

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PREPARING',
  'READY', 'SERVED', 'COMPLETED', 'CANCELLED',
];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PENDING', 'PREPARING', 'CANCELLED'],
  PREPARING: ['CONFIRMED', 'READY'],
  READY: ['PREPARING', 'SERVED'],
  SERVED: ['READY', 'COMPLETED'],
  COMPLETED: ['SERVED'],
  CANCELLED: [],
};

const ORDER_TYPE_LABEL = {
  FINE_DINE: 'Fine Dine',
  PICKUP: 'Pickup',
  DELIVERY: 'Delivery',
} as const;

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100   text-blue-700',
  PREPARING: 'bg-purple-100 text-purple-700',
  READY:     'bg-green-100  text-green-700',
  SERVED:    'bg-teal-100   text-teal-700',
  COMPLETED: 'bg-gray-100   text-gray-600',
  CANCELLED: 'bg-red-100    text-red-600',
};

const fetchAllOrders = async (status?: string, date?: string) => {
  const params: Record<string, string> = {};
  if (status && status !== 'REFUND_PENDING') params.status = status;
  if (date)   params.date   = date;
  const res = await api.get('/orders', { params });
  return res.data.data ?? res.data;
};

export default function OrdersTable() {
  const queryClient = useQueryClient();
  const navigate    = useNavigate();
  const socket      = useSocket();

  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate,   setFilterDate]   = useState('');
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [lockedRefundOrderIds, setLockedRefundOrderIds] = useState<Set<string>>(new Set());

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', filterStatus, filterDate],
    queryFn:  () => fetchAllOrders(filterStatus, filterDate),
    refetchOnMount: 'always',
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Status updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  const approveRefundMutation = useMutation({
    mutationFn: ({ orderId }: { orderId: string }) =>
      api.patch(`/payments/orders/${orderId}/refund/approve`, {
        reason: 'Approved from admin orders dashboard',
      }),
    onMutate: ({ orderId }) => {
      setRefundingOrderId(orderId);
      setLockedRefundOrderIds(prev => new Set(prev).add(orderId));
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: PENDING_REFUND_COUNT_QUERY_KEY });

      toast.success('Refund approved');

      queryClient.setQueriesData({ queryKey: ['admin-orders'] }, (prev: Order[] | undefined) => {
        if (!prev) return prev;
        return prev.map((order) =>
          order.id === variables.orderId
            ? {
                ...order,
                payment: order.payment
                  ? { ...order.payment, status: 'REFUNDED' as const }
                  : order.payment,
              }
            : order,
        );
      });

      setRefundingOrderId(null);
    },
    onError: (err: any, variables) => {
      const statusCode = err?.response?.status;

      if (statusCode === 409) {
        toast('Refund already processed');
        queryClient.setQueriesData({ queryKey: ['admin-orders'] }, (prev: Order[] | undefined) => {
          if (!prev) return prev;
          return prev.map((order) =>
            order.id === variables.orderId
              ? {
                  ...order,
                  payment: order.payment
                    ? { ...order.payment, status: 'REFUNDED' as const }
                    : order.payment,
                }
              : order,
          );
        });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: PENDING_REFUND_COUNT_QUERY_KEY });
        setRefundingOrderId(null);
        return;
      }

      toast.error(err.response?.data?.message || 'Failed to approve refund');
      setRefundingOrderId(null);
      setLockedRefundOrderIds(prev => {
        const next = new Set(prev);
        next.delete(variables.orderId);
        return next;
      });
    },
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('order:new', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    });

    socket.on('order:statusUpdated', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    });

    socket.on('payment:refundPending', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    });

    socket.on('payment:refunded', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    });

    return () => {
      socket.off('order:new');
      socket.off('order:statusUpdated');
      socket.off('payment:refundPending');
      socket.off('payment:refunded');
    };
  }, [socket, queryClient]);

  const pendingRefundOrders = orders.filter(
    (order: Order) => order.payment?.status === 'REFUND_PENDING',
  );

  const visibleOrders = orders.filter((order: Order) => {
    if (!filterStatus) return true;
    if (filterStatus === 'REFUND_PENDING') {
      return order.payment?.status === 'REFUND_PENDING';
    }
    return order.status === filterStatus;
  });

  if (isLoading) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  );

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm
                     outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="REFUND_PENDING">Refund Pending Approval</option>
        </select>

        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm
                     outline-none focus:ring-2 focus:ring-orange-400"
        />

        {(filterStatus || filterDate) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterDate(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700
                       border border-gray-300 rounded-xl transition"
          >
            Clear Filters
          </button>
        )}
      </div>

      {pendingRefundOrders.length > 0 && (
        <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-orange-700">
              {pendingRefundOrders.length} refund approval{pendingRefundOrders.length !== 1 ? 's' : ''} pending
            </p>
            <p className="text-xs text-orange-600">
              Use Approve Refund directly from Actions.
            </p>
          </div>
          <button
            onClick={() => setFilterStatus('REFUND_PENDING')}
            className="text-xs px-3 py-1.5 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 transition"
          >
            View Pending
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm
                      overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Order', 'Customer', 'Type / Table', 'Items', 'Total',
                'Status', 'Time', 'Actions'].map(h => (
                <th key={h}
                    className="text-left px-4 py-3 text-xs font-semibold
                               text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visibleOrders.map((order: Order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-bold text-gray-800">
                  {order.orderNumber}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {order.user?.name || '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {ORDER_TYPE_LABEL[order.orderType]}
                  {order.orderType === 'FINE_DINE' ? ` · ${order.tableNumber ? `Table ${order.tableNumber}` : 'Staff assigns table'}` : ''}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {order.orderItems.length} item
                  {order.orderItems.length !== 1 ? 's' : ''}
                </td>
                <td className="px-4 py-3 font-semibold text-orange-500">
                  ${Number(order.total).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs
                                      font-medium ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                    {order.payment?.status === 'REFUND_PENDING' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        REFUND_PENDING
                      </span>
                    )}
                    {order.payment?.status === 'REFUNDED' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        REFUNDED
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(order.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {order.payment?.status === 'REFUND_PENDING' && (
                      <button
                        onClick={() => approveRefundMutation.mutate({ orderId: order.id })}
                        disabled={refundingOrderId === order.id || lockedRefundOrderIds.has(order.id)}
                        className="text-xs px-2 py-1 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {refundingOrderId === order.id ? (
                          <>
                            <span className="inline-block w-3 h-3 border-2 border-orange-300 border-t-orange-700 rounded-full animate-spin" />
                            Approving...
                          </>
                        ) : lockedRefundOrderIds.has(order.id) ? (
                          'Approved'
                        ) : (
                          'Approve Refund'
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/ops/orders/${order.id}`)}
                      className="text-xs px-2 py-1 border border-gray-300
                                 rounded-lg hover:bg-gray-100 transition"
                    >
                      View
                    </button>

                    {/* Valid status transitions only */}
                    {ALLOWED_TRANSITIONS[order.status].length > 0 && (
                      <select
                        defaultValue=""
                        onChange={e => {
                          if (e.target.value) {
                            statusMutation.mutate({
                              id:     order.id,
                              status: e.target.value as OrderStatus,
                            });
                            e.target.value = '';
                          }
                        }}
                        className="text-xs border border-gray-300 rounded-lg
                                   px-1 py-1 outline-none"
                      >
                        <option value="" disabled>Set status</option>
                        {ALLOWED_TRANSITIONS[order.status].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visibleOrders.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No orders found
          </div>
        )}
      </div>
    </div>
  );
}
