import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../api/axios';
import type { Order, OrderStatus } from '../../types';
import { addItem, toggleCart } from '../cart/cardSlice';
import type { AppDispatch, RootState } from '../../app/store';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket';
import { groupOrders } from './utils/groupOrders';

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

const fetchOrders = async (): Promise<Order[]> => {
  const res = await api.get('/orders');
  return res.data.data ?? res.data;
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const user = useSelector((s: RootState) => s.auth.user);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const pageTitle = isAdminOrStaff ? 'All Orders' : 'My Orders';

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    refetchOnMount: 'always',
  });

  const groupedOrders = groupOrders(orders);

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.delete(`/orders/${orderId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to cancel order');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const handleReorder = (order: Order) => {
    order.orderItems.forEach((item) => {
      dispatch(
        addItem({
          menuItemId: item.menuItemId,
          name: item.itemNameSnapshot,
          price: Number(item.unitPrice),
          quantity: item.quantity,
          imageUrl: item.menuItem?.imageUrl,
          customisations: item.customisations ?? {},
        }),
      );
    });
    dispatch(toggleCart());
    toast.success('Items added to cart');
  };

  const handleCancel = (order: Order) => {
    const confirmed = window.confirm(
      `Cancel ${order.orderNumber}? You can only cancel before kitchen confirmation.`,
    );
    if (!confirmed) return;
    cancelMutation.mutate(order.id);
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('order:new', (order: Order) => {
      queryClient.setQueryData(['orders'], (prev: Order[] = []) => {
        const exists = prev.some((o) => o.id === order.id);
        if (exists) return prev;
        return [order, ...prev];
      });
    });

    socket.on('order:statusUpdated', (updated: Order) => {
      queryClient.setQueryData(['orders'], (prev: Order[] = []) =>
        prev.map((order) =>
          order.id === updated.id
            ? {
                ...order,
                ...updated,
                user: updated.user ?? order.user,
                orderItems: updated.orderItems ?? order.orderItems,
                payment: updated.payment ?? order.payment,
              }
            : order,
        ),
      );
    });

    return () => {
      socket.off('order:new');
      socket.off('order:statusUpdated');
    };
  }, [socket, queryClient]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8">
      <h1 className="heading-2 text-gray-800 mb-6">{pageTitle}</h1>

      {groupedOrders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-ui font-medium">No orders yet</p>
          <p className="body-text-sm mt-1">Place your first order from the menu</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedOrders.map((group) => (
            <div key={group.groupKey} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="heading-4 text-gray-800">
                    {group.orderCount} Order{group.orderCount !== 1 ? 's' : ''} · {group.user?.name || 'Unknown user'}
                  </h2>
                  <p className="body-text-sm text-gray-400 mt-0.5">
                    {ORDER_TYPE_LABEL[group.orderType]} · Latest {new Date(group.latestCreatedAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full label-text font-semibold ${STATUS_COLORS[group.status]}`}>
                  {group.status}
                </span>
              </div>

              <div className="text-sm text-gray-600 space-y-0.5 mb-3">
                {group.combinedItems.slice(0, 4).map((item) => (
                  <p key={item.signature}>
                    {item.quantity}× {item.itemNameSnapshot}
                  </p>
                ))}
                {group.combinedItems.length > 4 && (
                  <p className="text-gray-400">
                    +{group.combinedItems.length - 4} more combined items
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="font-bold text-orange-500">
                  ${group.combinedTotal.toFixed(2)}
                </span>
                <button
                  onClick={() => toggleGroup(group.groupKey)}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  {expandedGroups[group.groupKey] ? 'Hide Orders' : 'View Orders'}
                </button>
              </div>

              {expandedGroups[group.groupKey] && (
                <div className="mt-4 space-y-3">
                  {group.orders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleString()}
                            {order.orderType === 'FINE_DINE'
                              ? ` · ${order.tableNumber ? `Table ${order.tableNumber}` : 'Table assigned by staff'}`
                              : ''}
                          </p>
                          {isAdminOrStaff && (
                            <p className="text-xs text-gray-500 mt-1">
                              Ordered by: {order.user?.name || 'Unknown user'}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-orange-500">${Number(order.total).toFixed(2)}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {!isAdminOrStaff && order.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(order)}
                            disabled={cancelMutation.isPending}
                            className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                        <button
                          onClick={() => handleReorder(order)}
                          className="text-xs px-3 py-1.5 border border-orange-400 text-orange-500 rounded-lg hover:bg-orange-50 transition"
                        >
                          Reorder
                        </button>
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                        >
                          Track
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
