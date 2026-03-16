import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import type { Order, OrderStatus } from '../../types';
import Spinner from '../../components/ui/Spinner';
import PaymentPanel from './components/PaymentPanel';

const STATUS_STEPS: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED',
];

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

  // Live update via WebSocket
  useEffect(() => {
    if (!socket || !id) return;

    socket.on('order:statusUpdated', (updated: Order) => {
      if (updated.id === id) {
        // Update the cached order directly — no extra API call needed
        queryClient.setQueryData(['order', id], updated);
      }
    });

    socket.on('payment:processing', (data: {
      orderId: string;
      message: string;
    }) => {
      if (data.orderId === id) {
        toast.loading(data.message, {
          id:       'upi-processing',
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
        toast.dismiss('upi-processing');
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

    return () => {
      socket.off('order:statusUpdated');
      socket.off('payment:processing');
      socket.off('payment:confirmed');
      socket.off('payment:failed');
    };
  }, [socket, id, queryClient]);

  useEffect(() => {
    const paymentReturn = searchParams.get('payment');
    if (paymentReturn === 'complete') {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      window.history.replaceState({}, '', `/orders/${id}`);
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Order Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Table {order.tableNumber || 'N/A'} ·{' '}
              {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold
            ${isCancelled
              ? 'bg-red-100 text-red-600'
              : 'bg-orange-100 text-orange-600'
            }`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>
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
                                    justify-center text-xs font-bold transition-all
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