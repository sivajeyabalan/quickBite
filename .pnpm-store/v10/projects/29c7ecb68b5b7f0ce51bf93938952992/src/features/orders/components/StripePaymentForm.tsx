import { useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import Spinner from '../../../components/ui/Spinner';

interface Props {
  orderId:   string;
  onSuccess: () => void;
}

export default function StripePaymentForm({ orderId, onSuccess }: Props) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleElementLoadError = (event: any) => {
    const message = event?.error?.message || 'Failed to load payment form';
    toast.error(message);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}?payment=complete`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        await api.post(`/payments/stripe/sync/${orderId}`);
      } catch {
        toast.error('Payment captured, but status sync is delayed. Please refresh in a moment.');
      }
      toast.success('Payment successful!');
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: false,
          },
          wallets: {
            googlePay: 'auto',
            applePay:  'auto',
          },
        } as any}
        onLoadError={handleElementLoadError}
      />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white
                   font-semibold py-3 rounded-xl transition
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Spinner size="sm" /> : 'Pay Now'}
      </button>
      <p className="text-xs text-gray-400 text-center">
        Test card: 4242 4242 4242 4242 · Any future date · Any CVC
      </p>
    </form>
  );
}
