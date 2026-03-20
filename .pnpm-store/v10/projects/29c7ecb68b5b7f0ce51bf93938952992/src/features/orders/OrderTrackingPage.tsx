import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import type { Order, OrderStatus } from '../../types';
import Spinner from '../../components/ui/Spinner';
import PaymentPanel from './components/PaymentPanel';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';

const STATUS_STEPS: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED',
];

const ORDER_TYPE_LABEL = {
  FINE_DINE: 'Fine Dine',
  PICKUP: 'Pickup',
  DELIVERY: 'Delivery',
} as const;

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:   '⏳ Pending',
  CONFIRMED: '✅ Confirmed',
  PREPARING: '👨‍🍳 Preparing',
  READY:     '🔔 Ready',
  SERVED:    '🍽 Served',
  COMPLETED: '🎉 Completed',
  CANCELLED: '❌ Cancelled',
};

const fetchOrder = async (id: string): Promise<Order> => {
  const res = await api.get(`/orders/${id}`);
  return res.data.data ?? res.data;
};

export default function OrderTrackingPage() {
  const { id }        = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryClient   = useQueryClient();
  const socket        = useSocket();
  const user          = useSelector((s: RootState) => s.auth.user);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => fetchOrder(id!),
    enabled:  !!id,
    refetchInterval: (query) => {
      const data = query.state.data as Order | undefined;
      if (!data) return 3000;
      const isPending =
        data.payment?.status === 'PENDING' ||
        (!data.payment && data.status !== 'CANCELLED');
      return isPending ? 3000 : false;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.delete(`/orders/${orderId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to cancel order');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });

  // Live update via WebSocket
  useEffect(() => {
    if (!socket || !id) return;

    socket.on('order:statusUpdated', (updated: Order) => {
      if (updated.id === id) {
        queryClient.setQueryData(['order', id], (prev: Order | undefined) => {
          if (!prev) return updated;
          return {
            ...prev,
            ...updated,
            orderItems: updated.orderItems ?? prev.orderItems,
            payment: updated.payment ?? prev.payment,
            user: updated.user ?? prev.user,
            deliveryAddressSnapshot:
              updated.deliveryAddressSnapshot ?? prev.deliveryAddressSnapshot,
          };
        });

        queryClient.invalidateQueries({ queryKey: ['order', id] });
      }
    });

    socket.on('payment:processing', (data: {
      orderId: string;
      message: string;
    }) => {
      if (data.orderId === id) {
        toast.loading(data.message, {
          id:       'payment-processing',
          duration: 30000,
        });
      }
    });

    socket.on('payment:confirmed', (data: {
      orderId: string;
      orderNumber: string;
      amount: number;
    }) => {
      if (data.orderId === id) {
        toast.dismiss('payment-processing');
        queryClient.invalidateQueries({ queryKey: ['order', id] });
        toast.success(
          `Payment of $${data.amount.toFixed(2)} confirmed!`,
        );
      }
    });

    socket.on('payment:failed', (data: { orderId: string }) => {
      if (data.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ['order', id] });
        toast.error('Payment failed. Please try again.');
      }
    });

    socket.on('payment:refundPending', (data: { orderId: string }) => {
      if (data.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ['order', id] });
        toast('Refund is pending staff/admin approval.');
      }
    });

    socket.on('payment:refunded', (data: { orderId: string }) => {
      if (data.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ['order', id] });
        toast.success('Refund processed successfully');
      }
    });

    return () => {
      socket.off('order:statusUpdated');
      socket.off('payment:processing');
      socket.off('payment:confirmed');
      socket.off('payment:failed');
      socket.off('payment:refundPending');
      socket.off('payment:refunded');
    };
  }, [socket, id, queryClient]);

  useEffect(() => {
    const paymentReturn = searchParams.get('payment');
    if (paymentReturn === 'complete') {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, id, queryClient]);

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );

  if (!order) return (
    <div className="text-center py-20 text-gray-400">Order not found</div>
  );

  const isCancelled = order.status === 'CANCELLED';
  const currentStep = STATUS_STEPS.indexOf(order.status);

  const handleCancel = () => {
    const confirmed = window.confirm(
      `Cancel ${order.orderNumber}? You can only cancel before kitchen confirmation.`,
    );

    if (!confirmed) return;
    cancelMutation.mutate(order.id);
  };

  return (
    <div className="w-full px-6 py-8">

      {/* Order Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="heading-2 text-gray-800">
              {order.orderNumber}
            </h1>
            <p className="body-text-sm text-gray-500 mt-1">
              {ORDER_TYPE_LABEL[order.orderType]} 
              {order.orderType === 'FINE_DINE' ? ` · ${order.tableNumber ? `Table ${order.tableNumber}` : 'Table assigned by staff'}` : ''} ·{' '}
              {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-full label-text
            ${isCancelled
              ? 'bg-red-100 text-red-600'
              : 'bg-orange-100 text-orange-600'
            }`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>

        {user?.role === 'CUSTOMER' && order.status === 'PENDING' && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">
              Cancelable until kitchen confirms
            </p>
            <button
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="text-sm px-4 py-2 border border-red-300 text-red-600
                         rounded-lg hover:bg-red-50 transition
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
            </button>
          </div>
        )}
      </div>

      {/* Status Stepper */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100
                        p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-5">Order Progress</h2>
          <div className="relative">

            {/* Progress Line */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
            <div
              className="absolute top-4 left-4 h-0.5 bg-orange-400 transition-all
                         duration-700"
              style={{
                width: currentStep <= 0
                  ? '0%'
                  : `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%`,
              }}
            />

            {/* Steps */}
            <div className="relative flex justify-between">
              {STATUS_STEPS.map((step, index) => {
                const done    = index < currentStep;
                const current = index === currentStep;
                return (
                  <div key={step} className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center
                                    justify-center label-text transition-all
                      ${done    ? 'bg-orange-500 border-orange-500 text-white'
                        : current ? 'bg-white border-orange-500 text-orange-500'
                        : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                      {done ? '✓' : index + 1}
                    </div>
                    <span className={`text-xs text-center max-w-[60px] leading-tight
                      ${current ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
                      {step.charAt(0) + step.slice(1).toLowerCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Items</h2>
        <div className="space-y-3">
          {order.orderItems.map(item => (
            <div key={item.id} className="flex justify-between items-start text-sm">
              <div>
                <p className="font-medium text-gray-800">
                  {item.quantity}× {item.itemNameSnapshot}
                </p>
                {item.customisations &&
                  Object.keys(item.customisations).length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {Object.entries(item.customisations)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </p>
                )}
              </div>
              <span className="font-semibold text-gray-700">
                ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-100 mt-4 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>${Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax</span>
            <span>${Number(order.tax).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-800 text-base pt-1">
            <span>Total</span>
            <span className="text-orange-500">
              ${Number(order.total).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {order.status !== 'PENDING' && (
        <PaymentPanel order={order} />
      )}
    </div>
  );
}
