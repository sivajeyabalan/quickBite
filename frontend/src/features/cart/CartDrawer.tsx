import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import type { AppDispatch } from '../../app/store';
import {
  removeItem, updateQuantity, clearCart,
  toggleCart, setTableNumber,
  selectCartItems, selectCartOpen,
  selectCartTotal, selectTableNumber,
} from './cardSlice'
import type { CartItem } from '../../types';
import Spinner from '../../components/ui/Spinner';

const TAX_RATE = 0.10;

export default function CartDrawer() {
  const dispatch  = useDispatch<AppDispatch>();
  const navigate  = useNavigate();

  const items       = useSelector(selectCartItems);
  const isOpen      = useSelector(selectCartOpen);
  const subtotal    = useSelector(selectCartTotal);
  const tableNumber = useSelector(selectTableNumber);

  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);

  const tax   = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        items: items.map((item: CartItem) => ({
          menuItemId:     item.menuItemId,
          quantity:       item.quantity,
          customisations: item.customisations ?? {},
        })),
        tableNumber: tableNumber || undefined,
        notes:       notes      || undefined,
      };

      const res = await api.post('/orders', payload);
      const order = res.data.data ?? res.data;

      dispatch(clearCart());
      dispatch(toggleCart());
      toast.success(`Order ${order.orderNumber} placed!`);
      navigate(`/orders/${order.id}`);

    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to place order';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={() => dispatch(toggleCart())}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white
                      shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Your Cart</h2>
          <button
            onClick={() => dispatch(toggleCart())}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center
                          text-gray-400 gap-3">
            <span className="text-5xl">🛒</span>
            <p className="font-medium">Your cart is empty</p>
            <p className="text-sm">Add items from the menu</p>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.map((item: CartItem) => (
                <div
                  key={item.menuItemId}
                  className="flex gap-4 bg-gray-50 rounded-xl p-3"
                >
                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg bg-gray-200
                                  overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center
                                      justify-center text-2xl">
                        🍽
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {item.name}
                    </p>

                    {/* Customisations */}
                    {item.customisations &&
                      Object.keys(item.customisations).length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {Object.entries(item.customisations)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (item.quantity === 1) {
                              dispatch(removeItem(item.menuItemId));
                            } else {
                              dispatch(updateQuantity({
                                menuItemId: item.menuItemId,
                                quantity:   item.quantity - 1,
                              }));
                            }
                          }}
                          className="w-6 h-6 rounded-full border border-gray-300
                                     text-gray-600 flex items-center justify-center
                                     text-sm hover:border-red-400 hover:text-red-400
                                     transition"
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            dispatch(updateQuantity({
                              menuItemId: item.menuItemId,
                              quantity:   item.quantity + 1,
                            }))
                          }
                          className="w-6 h-6 rounded-full border border-gray-300
                                     text-gray-600 flex items-center justify-center
                                     text-sm hover:border-orange-400 transition"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Total */}
                      <span className="text-sm font-bold text-orange-500">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => dispatch(removeItem(item.menuItemId))}
                    className="text-gray-300 hover:text-red-400 transition
                               self-start text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Table Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. T5"
                  value={tableNumber}
                  onChange={e => dispatch(setTableNumber(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Any special requests..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             text-sm outline-none focus:ring-2 focus:ring-orange-400
                             resize-none"
                />
              </div>
            </div>

            {/* Footer — Totals + Place Order */}
            <div className="border-t border-gray-100 px-5 py-4 space-y-3">
              {/* Breakdown */}
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (10%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800
                                text-base pt-1 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-orange-500">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={loading || items.length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white
                           font-semibold py-3 rounded-xl transition
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Spinner size="sm" /> : `Place Order — $${total.toFixed(2)}`}
              </button>

              {/* Clear Cart */}
              <button
                onClick={() => dispatch(clearCart())}
                className="w-full text-sm text-gray-400 hover:text-red-400
                           transition py-1"
              >
                Clear Cart
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}