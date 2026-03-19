import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import type { Order, PaymentMethod } from '../../../types';
import StripePaymentForm from './StripePaymentForm';
import Spinner from '../../../components/ui/Spinner';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
);

export default function PaymentPanel({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const user = useSelector((s: RootState) => s.auth.user);
  const isStaffOrAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN';
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLocallyPaid, setIsLocallyPaid] = useState(false);
  const [refundLocked, setRefundLocked] = useState(false);

  const cashMutation = useMutation({
    mutationFn: (method: PaymentMethod) =>
      api.post('/payments', { orderId: order.id, method }),
    onSuccess: () => {
      toast.success('Cash selected. Kitchen/staff notified.');
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Payment failed');
    },
  });

  const intentMutation = useMutation({
    mutationFn: () =>
      api.post('/payments/stripe/intent', {
        orderId: order.id,
      }),
    onSuccess: (res) => {
      setClientSecret(
        res.data.clientSecret ?? res.data.data?.clientSecret,
      );
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'Failed to initialise payment';
      if (String(message).toLowerCase().includes('already completed')) {
        queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      }
      toast.error(message);
    },
  });

  const handlePaymentSuccess = () => {
    setIsLocallyPaid(true);
    queryClient.invalidateQueries({ queryKey: ['order', order.id] });
    setClientSecret(null);
  };

  const approveRefundMutation = useMutation({
    mutationFn: () =>
      api.patch(`/payments/orders/${order.id}/refund/approve`, {
        reason: 'Approved by staff/admin from order tracking',
      }),
    onMutate: () => {
      setRefundLocked(true);
    },
    onSuccess: () => {
      toast.success('Refund approved and processed');

      queryClient.setQueryData(['order', order.id], (prev: Order | undefined) => {
        if (!prev) return prev;
        return {
          ...prev,
          payment: prev.payment
            ? { ...prev.payment, status: 'REFUNDED' }
            : prev.payment,
        };
      });

      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    },
    onError: (err: any) => {
      const statusCode = err?.response?.status;

      if (statusCode === 409) {
        toast('Refund already processed');
        queryClient.setQueryData(['order', order.id], (prev: Order | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            payment: prev.payment
              ? { ...prev.payment, status: 'REFUNDED' }
              : prev.payment,
          };
        });
        queryClient.invalidateQueries({ queryKey: ['order', order.id] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
        return;
      }

      toast.error(err.response?.data?.message || 'Failed to approve refund');
      setRefundLocked(false);
    },
  });

  if (isLocallyPaid || (order.payment && order.payment.status === 'PAID')) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border
                      border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">
          Payment
        </h2>
        <div className="bg-green-50 border border-green-200
                        rounded-xl p-4 space-y-2">
          <p className="text-green-700 font-semibold">
            Payment Confirmed
          </p>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Amount</span>
              <span className="font-bold">
                ${Number(order.payment?.amount ?? order.total).toFixed(2)}
              </span>
            </div>
            {order.payment?.method && (
              <div className="flex justify-between">
                <span>Method</span>
                <span>{order.payment.method}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-green-600 font-medium">
                {order.payment?.status ?? 'PAID'}
              </span>
            </div>
            {order.payment?.paidAt && (
              <div className="flex justify-between">
                <span>Paid at</span>
                <span>
                  {new Date(order.payment.paidAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (order.payment?.method === 'CASH' && order.payment.status === 'PENDING') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border
                      border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Payment</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-amber-700 font-semibold">Cash Payment Selected</p>
          <p className="text-sm text-gray-600">
            Staff has been notified. Please pay in cash at counter/table.
          </p>
          <div className="text-sm text-gray-600 flex justify-between">
            <span>Amount</span>
            <span className="font-bold">${Number(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (order.payment?.status === 'REFUNDED') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border
                      border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Payment</h2>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
          <p className="text-emerald-700 font-semibold">Refund Completed</p>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Refund Amount</span>
              <span className="font-bold">${Number(order.payment.refundAmount ?? order.payment.amount ?? order.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-emerald-700 font-medium">REFUNDED</span>
            </div>
            {order.payment.refundedAt && (
              <div className="flex justify-between">
                <span>Refunded at</span>
                <span>{new Date(order.payment.refundedAt).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (order.payment?.status === 'REFUND_PENDING') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border
                      border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Payment</h2>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
          <p className="text-orange-700 font-semibold">Refund Pending Approval</p>
          <p className="text-sm text-gray-600">
            Order is cancelled and refund is pending staff/admin approval.
          </p>
          <div className="text-sm text-gray-600 flex justify-between">
            <span>Amount</span>
            <span className="font-bold">${Number(order.payment.refundAmount ?? order.payment.amount ?? order.total).toFixed(2)}</span>
          </div>
          {isStaffOrAdmin && (
            <button
              onClick={() => approveRefundMutation.mutate()}
              disabled={approveRefundMutation.isPending || refundLocked}
              className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {approveRefundMutation.isPending
                ? <Spinner size="sm" />
                : refundLocked
                  ? 'Approved'
                  : 'Approve Refund'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (order.status === 'CANCELLED') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border
                      border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-2">Payment</h2>
        <p className="text-sm text-red-500">
          This order was cancelled. No payment required.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border
                    border-gray-100 p-6">
      <h2 className="font-semibold text-gray-700 mb-1">Payment</h2>
      <p className="text-sm text-gray-400 mb-5">
        Total due:{' '}
        <span className="text-orange-500 font-bold text-base">
          ${Number(order.total).toFixed(2)}
        </span>
      </p>

      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripePaymentForm
            orderId={order.id}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {[
              { value: 'CASH', label: 'Cash', icon: '' },
              { value: 'CARD', label: 'Card', icon: '' },
            ].map(m => (
              <button
                key={m.value}
                onClick={() =>
                  setSelectedMethod(m.value as PaymentMethod)
                }
                className={`flex flex-col items-center gap-1.5 py-3
                            rounded-xl border-2 text-xs font-medium
                            transition
                  ${selectedMethod === m.value
                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                    : 'border-gray-200 text-gray-600'
                  }`}
              >
                <span className="text-2xl">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          <button
            disabled={
              cashMutation.isPending || intentMutation.isPending
            }
            onClick={() => {
              if (selectedMethod === 'CARD') {
                intentMutation.mutate();
              } else {
                cashMutation.mutate(selectedMethod);
              }
            }}
            className="w-full bg-orange-500 hover:bg-orange-600
                       text-white font-semibold py-3 rounded-xl
                       transition disabled:opacity-50"
          >
            {cashMutation.isPending || intentMutation.isPending
              ? <Spinner size="sm" />
              : `Pay $${Number(order.total).toFixed(2)} via ${selectedMethod}`
            }
          </button>
        </>
      )}
    </div>
  );
}
