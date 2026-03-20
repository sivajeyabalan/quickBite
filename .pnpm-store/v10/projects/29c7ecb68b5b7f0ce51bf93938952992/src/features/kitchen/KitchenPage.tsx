import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKitchenSet } from '@fortawesome/free-solid-svg-icons';
import api from '../../api/axios';
import { useSocket } from '../../hooks/useSocket';
import type { Order, OrderStatus, OrderType } from '../../types';
import Spinner from '../../components/ui/Spinner';
import { groupOrders, type GroupedOrder } from '../orders/utils/groupOrders';

const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'];
const ORDER_TYPE_TABS: { label: string; value: 'ALL' | OrderType }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Fine Dine', value: 'FINE_DINE' },
  { label: 'Pickup', value: 'PICKUP' },
  { label: 'Delivery', value: 'DELIVERY' },
];

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  FINE_DINE: 'Fine Dine',
  PICKUP: 'Pickup',
  DELIVERY: 'Delivery',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'border-yellow-400 bg-yellow-50',
  CONFIRMED: 'border-blue-400   bg-blue-50',
  PREPARING: 'border-purple-400 bg-purple-50',
  READY: 'border-green-400  bg-green-50',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100   text-blue-700',
  PREPARING: 'bg-purple-100 text-purple-700',
  READY: 'bg-green-100  text-green-700',
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'SERVED',
  SERVED: 'COMPLETED',
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Confirm Orders',
  CONFIRMED: 'Start Preparing',
  PREPARING: 'Mark Ready',
  READY: 'Mark Served',
  SERVED: 'Mark Completed',
};

const PREV_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: 'PENDING',
  PREPARING: 'CONFIRMED',
  READY: 'PREPARING',
  SERVED: 'READY',
  COMPLETED: 'SERVED',
};

const PREV_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Move Back to Pending',
  PREPARING: 'Move Back to Confirmed',
  READY: 'Move Back to Preparing',
  SERVED: 'Move Back to Ready',
  COMPLETED: 'Move Back to Served',
};

const fetchActiveOrders = async (): Promise<Order[]> => {
  const res = await api.get('/orders');
  const all: Order[] = res.data.data ?? res.data;
  return all.filter((o) => ACTIVE_STATUSES.includes(o.status));
};

function GroupCard({
  group,
  onAdvance,
  onRetreat,
  advancing,
}: {
  group: GroupedOrder;
  onAdvance: (group: GroupedOrder, status: OrderStatus) => void;
  onRetreat: (group: GroupedOrder, status: OrderStatus) => void;
  advancing: string | null;
}) {
  const nextStatus = NEXT_STATUS[group.status];
  const nextLabel = NEXT_LABEL[group.status];
  const prevStatus = PREV_STATUS[group.status];
  const prevLabel = PREV_LABEL[group.status];

  const minutesAgo = Math.floor((Date.now() - new Date(group.latestCreatedAt).getTime()) / 60000);
  const orderNumbers = group.orders.map((o) => o.orderNumber).join(', ');

  const hasCashPending = group.orders.some(
    (order) => order.payment?.method === 'CASH' && order.payment?.status === 'PENDING',
  );
  const hasPaid = group.orders.some((order) => order.payment?.status === 'PAID');
  const hasRefundPending = group.orders.some((order) => order.payment?.status === 'REFUND_PENDING');
  const hasRefunded = group.orders.some((order) => order.payment?.status === 'REFUNDED');

  const paymentStatusByOrder = group.orders.map((order) => {
    if (order.payment?.status === 'PAID') {
      return { orderNumber: order.orderNumber, label: 'PAID', className: 'bg-green-100 text-green-700 border-green-200' };
    }

    if (order.payment?.status === 'REFUND_PENDING') {
      return { orderNumber: order.orderNumber, label: 'REFUND PENDING', className: 'bg-orange-100 text-orange-700 border-orange-200' };
    }

    if (order.payment?.status === 'REFUNDED') {
      return { orderNumber: order.orderNumber, label: 'REFUNDED', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }

    return {
      orderNumber: order.orderNumber,
      label: 'PAYMENT PENDING',
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    };
  });

  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm transition-all duration-300 ${STATUS_COLORS[group.status]}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="heading-4 text-gray-800">
            {group.orderCount > 1 ? `${group.orderCount} Orders` : orderNumbers}
          </h3>
          <p className="body-text-sm text-gray-500 mt-0.5">
            {ORDER_TYPE_LABEL[group.orderType]} · {group.user?.name || 'Unknown user'} · {minutesAgo}m ago
          </p>
          {group.orderCount > 1 && (
            <p className="text-xs text-gray-500 mt-1">
              {orderNumbers}
            </p>
          )}
          {hasCashPending && (
            <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
              Collect Payment
            </span>
          )}
          {hasPaid && (
            <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700 border border-green-200">
              Paid
            </span>
          )}
          {hasRefundPending && (
            <span className="inline-block mt-2 ml-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
              Refund Pending
            </span>
          )}
          {hasRefunded && (
            <span className="inline-block mt-2 ml-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              Refunded
            </span>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {paymentStatusByOrder.map((paymentItem) => (
              <span
                key={`${group.groupKey}-${paymentItem.orderNumber}`}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${paymentItem.className}`}
              >
                <span>{paymentItem.orderNumber}</span>
                <span>•</span>
                <span>{paymentItem.label}</span>
              </span>
            ))}
          </div>
        </div>
        <span className={`label-text font-bold ${STATUS_BADGE[group.status]}`}>
          {group.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {group.combinedItems.map((item) => (
          <div key={item.signature} className="flex justify-between items-start text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-bold text-gray-800 mr-2">×{item.quantity}</span>
              <span className="text-gray-700">{item.itemNameSnapshot}</span>
              {item.customisations && Object.keys(item.customisations).length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5 pl-6">
                  {Object.entries(item.customisations)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 text-sm text-gray-700 font-semibold">
        Total: ${group.combinedTotal.toFixed(2)}
      </div>

      <div className="space-y-2">
        {nextStatus && nextLabel && (
          <button
            onClick={() => onAdvance(group, nextStatus)}
            disabled={advancing === group.groupKey}
            className="w-full py-2.5 rounded-xl font-semibold text-sm bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {advancing === group.groupKey ? <Spinner size="sm" /> : `→ ${nextLabel}`}
          </button>
        )}

        {prevStatus && prevLabel && (
          <button
            onClick={() => onRetreat(group, prevStatus)}
            disabled={advancing === group.groupKey}
            className="w-full py-2.5 rounded-xl font-semibold text-sm bg-white hover:bg-gray-50 border border-gray-200 text-gray-500 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {advancing === group.groupKey ? <Spinner size="sm" /> : `← ${prevLabel}`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<'ALL' | OrderType>('ALL');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: fetchActiveOrders,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('order:new', (order: Order) => {
      queryClient.setQueryData(['kitchen-orders'], (prev: Order[] = []) => {
        const exists = prev.find((o) => o.id === order.id);
        if (exists) return prev;
        return [order, ...prev];
      });

      playChime();
      toast.success(`New order: ${order.orderNumber}`, { duration: 4000 });
    });

    socket.on('order:statusUpdated', (updated: Order) => {
      queryClient.setQueryData(
        ['kitchen-orders'],
        (prev: Order[] = []) =>
          prev
            .map((o) => {
              if (o.id !== updated.id) return o;
              return {
                ...o,
                ...updated,
                user: updated.user ?? o.user,
                orderItems: updated.orderItems ?? o.orderItems,
                payment: updated.payment ?? o.payment,
              };
            })
            .filter((o) => ACTIVE_STATUSES.includes(o.status)),
      );
    });

    socket.on('payment:cashSelected', (data: { orderId: string; orderNumber: string; message: string }) => {
      toast(`💵 ${data.orderNumber}: ${data.message}`, { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    });

    socket.on('payment:confirmed', () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    });
    socket.on('payment:failed', () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    });
    socket.on('payment:refundPending', () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    });
    socket.on('payment:refunded', () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    });

    return () => {
      socket.off('order:new');
      socket.off('order:statusUpdated');
      socket.off('payment:cashSelected');
      socket.off('payment:confirmed');
      socket.off('payment:failed');
      socket.off('payment:refundPending');
      socket.off('payment:refunded');
    };
  }, [socket, queryClient]);

  const handleAdvance = async (group: GroupedOrder, nextStatus: OrderStatus) => {
    setAdvancing(group.groupKey);
    try {
      await api.patch('/orders/bulk-status', {
        orderIds: group.orders.map((order) => order.id),
        fromStatus: group.status,
        toStatus: nextStatus,
        orderType: group.orderType,
        userId: group.user.id,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    } finally {
      setAdvancing(null);
    }
  };

  const filteredOrders = orders.filter((order) =>
    orderTypeFilter === 'ALL' ? true : order.orderType === orderTypeFilter,
  );
  const groupedOrders = groupOrders(filteredOrders);

  const pending = groupedOrders.filter((o) => o.status === 'PENDING');
  const confirmed = groupedOrders.filter((o) => o.status === 'CONFIRMED');
  const preparing = groupedOrders.filter((o) => o.status === 'PREPARING');
  const ready = groupedOrders.filter((o) => o.status === 'READY');

  const columns = [
    { label: ' PENDING', count: pending.length, orders: pending, color: 'text-yellow-600' },
    { label: ' CONFIRMED', count: confirmed.length, orders: confirmed, color: 'text-blue-600' },
    { label: ' PREPARING', count: preparing.length, orders: preparing, color: 'text-purple-600' },
    { label: ' READY', count: ready.length, orders: ready, color: 'text-green-600' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="heading-2 text-gray-800 inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faKitchenSet} beatFade className="text-[1em]" />
            <span>Kitchen Display</span>
          </h1>
          <p className="body-text-sm text-gray-500 mt-0.5">
            {groupedOrders.length} active group{groupedOrders.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 font-ui text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {ORDER_TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setOrderTypeFilter(tab.value)}
            className={`font-ui px-3 py-1.5 text-sm rounded-full border font-medium transition ${
              orderTypeFilter === tab.value
                ? 'border-orange-500 bg-orange-50 text-orange-600'
                : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {groupedOrders.length === 0 && (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">🎉</p>
          <p className="heading-4 text-gray-800">All caught up!</p>
          <p className="body-text-sm text-gray-400 mt-1">No active orders right now</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {columns.map((col) => (
          <div key={col.label}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`font-bold text-sm ${col.color}`}>{col.label}</h2>
              {col.count > 0 && (
                <span className="text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-medium">
                  {col.count}
                </span>
              )}
            </div>

            <div className="space-y-4 min-h-[100px]">
              {col.orders.length === 0 ? (
                <div className="text-center py-8 text-gray-300 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
                  No orders
                </div>
              ) : (
                col.orders
                  .sort(
                    (a, b) =>
                      new Date(a.latestCreatedAt).getTime() - new Date(b.latestCreatedAt).getTime(),
                  )
                  .map((group) => (
                    <GroupCard
                      key={group.groupKey}
                      group={group}
                      onAdvance={handleAdvance}
                      onRetreat={handleAdvance}
                      advancing={advancing}
                    />
                  ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    // Audio not available
  }
}
