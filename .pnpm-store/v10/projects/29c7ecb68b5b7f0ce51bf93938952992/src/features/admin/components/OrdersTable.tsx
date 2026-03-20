import { Fragment, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import type { Order, OrderStatus } from '../../../types';
import Spinner from '../../../components/ui/Spinner';
import { useSocket } from '../../../hooks/useSocket';
import { PENDING_REFUND_COUNT_QUERY_KEY } from '../../../hooks/usePendingRefundCount';
import { groupOrders } from '../../orders/utils/groupOrders';

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'SERVED',
  'COMPLETED',
  'CANCELLED',
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
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100   text-blue-700',
  PREPARING: 'bg-purple-100 text-purple-700',
  READY: 'bg-green-100  text-green-700',
  SERVED: 'bg-teal-100   text-teal-700',
  COMPLETED: 'bg-gray-100   text-gray-600',
  CANCELLED: 'bg-red-100    text-red-600',
};

const fetchAllOrders = async (status?: string, date?: string) => {
  const params: Record<string, string> = {};
  if (status && status !== 'REFUND_PENDING') params.status = status;
  if (date) params.date = date;
  const res = await api.get('/orders', { params });
  return res.data.data ?? res.data;
};

export default function OrdersTable() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const socket = useSocket();

  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [busyGroup, setBusyGroup] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', filterStatus, filterDate],
    queryFn: () => fetchAllOrders(filterStatus, filterDate),
    refetchOnMount: 'always',
  });

  const groupedOrders = useMemo(() => groupOrders(orders), [orders]);

  const statusMutation = useMutation({
    mutationFn: (payload: {
      orderIds: string[];
      fromStatus: OrderStatus;
      toStatus: OrderStatus;
      orderType: Order['orderType'];
      userId: string;
      groupKey: string;
    }) =>
      api.patch('/orders/bulk-status', {
        orderIds: payload.orderIds,
        fromStatus: payload.fromStatus,
        toStatus: payload.toStatus,
        orderType: payload.orderType,
        userId: payload.userId,
      }),
    onMutate: (payload) => {
      setBusyGroup(payload.groupKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Group status updated');
      setBusyGroup(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
      setBusyGroup(null);
    },
  });

  const approveRefundMutation = useMutation({
    mutationFn: ({ orderId }: { orderId: string }) =>
      api.patch(`/payments/orders/${orderId}/refund/approve`, {
        reason: 'Approved from admin orders dashboard',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: PENDING_REFUND_COUNT_QUERY_KEY });
      toast.success('Refund approved');
    },
    onError: (err: any) => {
      const statusCode = err?.response?.status;
      if (statusCode === 409) {
        toast('Refund already processed');
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: PENDING_REFUND_COUNT_QUERY_KEY });
        return;
      }
      toast.error(err.response?.data?.message || 'Failed to approve refund');
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

  const pendingRefundOrders = orders.filter((order: Order) => order.payment?.status === 'REFUND_PENDING');

  const visibleGroups = groupedOrders.filter((group) => {
    if (!filterStatus) return true;
    if (filterStatus === 'REFUND_PENDING') {
      return group.orders.some((order) => order.payment?.status === 'REFUND_PENDING');
    }
    return group.status === filterStatus;
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="REFUND_PENDING">Refund Pending Approval</option>
        </select>

        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />

        {(filterStatus || filterDate) && (
          <button
            onClick={() => {
              setFilterStatus('');
              setFilterDate('');
            }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-xl transition"
          >
            Clear Filters
          </button>
        )}
      </div>

      {pendingRefundOrders.length > 0 && (
        <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="button-text text-orange-700">
              {pendingRefundOrders.length} refund approval{pendingRefundOrders.length !== 1 ? 's' : ''} pending
            </p>
            <p className="body-text-sm text-orange-600">Use Approve Refund from expanded group details.</p>
          </div>
          <button
            onClick={() => setFilterStatus('REFUND_PENDING')}
            className="text-xs px-3 py-1.5 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 transition"
          >
            View Pending
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Orders', 'Customer', 'Type', 'Items', 'Total', 'Status', 'Time', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 label-text text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visibleGroups.map((group) => (
              <Fragment key={group.groupKey}>
                <tr className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-bold text-gray-800">
                    {group.orderCount} order{group.orderCount !== 1 ? 's' : ''}
                    <div className="text-xs text-gray-500 font-normal mt-1">
                      {group.orders.map((o) => o.orderNumber).join(', ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{group.user?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{ORDER_TYPE_LABEL[group.orderType]}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {group.combinedItems.length} combined item{group.combinedItems.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 font-semibold text-orange-500">${group.combinedTotal.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className={`label-text font-medium ${STATUS_COLORS[group.status]}`}>{group.status}</span>
                      {group.orders.some((o) => o.payment?.status === 'REFUND_PENDING') && (
                        <span className="label-text font-medium bg-orange-100 text-orange-700">REFUND_PENDING</span>
                      )}
                      {group.orders.some((o) => o.payment?.status === 'REFUNDED') && (
                        <span className="label-text font-medium bg-emerald-100 text-emerald-700">REFUNDED</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(group.latestCreatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() =>
                          setExpandedGroups((prev) => ({ ...prev, [group.groupKey]: !prev[group.groupKey] }))
                        }
                        className="text-xs px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                      >
                        {expandedGroups[group.groupKey] ? 'Hide' : 'View'}
                      </button>

                      {ALLOWED_TRANSITIONS[group.status].length > 0 && (
                        <select
                          defaultValue=""
                          disabled={busyGroup === group.groupKey}
                          onChange={(e) => {
                            if (!e.target.value) return;
                            statusMutation.mutate({
                              orderIds: group.orders.map((order) => order.id),
                              fromStatus: group.status,
                              toStatus: e.target.value as OrderStatus,
                              orderType: group.orderType,
                              userId: group.user.id,
                              groupKey: group.groupKey,
                            });
                            e.target.value = '';
                          }}
                          className="text-xs border border-gray-300 rounded-lg px-1 py-1 outline-none"
                        >
                          <option value="" disabled>
                            {busyGroup === group.groupKey ? 'Updating...' : 'Set status'}
                          </option>
                          {ALLOWED_TRANSITIONS[group.status].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedGroups[group.groupKey] && (
                  <tr key={`${group.groupKey}-details`} className="bg-gray-50">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="space-y-2">
                        {group.orders.map((order) => (
                          <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{order.orderNumber}</p>
                              <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {order.payment?.status === 'REFUND_PENDING' && (
                                <button
                                  onClick={() => approveRefundMutation.mutate({ orderId: order.id })}
                                  disabled={approveRefundMutation.isPending}
                                  className="text-xs px-2 py-1 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition disabled:opacity-50"
                                >
                                  Approve Refund
                                </button>
                              )}
                              <button
                                onClick={() => navigate(`/ops/orders/${order.id}`)}
                                className="text-xs px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                              >
                                View Order
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        {visibleGroups.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No orders found</div>
        )}
      </div>
    </div>
  );
}
