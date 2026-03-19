import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import type { AppDispatch } from '../../app/store';
import {
  removeItem, updateQuantity, clearCart,
  toggleCart, setOrderType,
  selectCartItems, selectCartOpen,
  selectCartTotal, selectOrderType,
} from './cardSlice'
import type { Address, CartItem, OrderType, TableAssignment, TableRequest } from '../../types';
import Spinner from '../../components/ui/Spinner';

const TAX_RATE = 0.10;

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: 'FINE_DINE', label: 'Fine Dine' },
  { value: 'PICKUP', label: 'Pickup' },
  { value: 'DELIVERY', label: 'Delivery' },
];

const EMPTY_NEW_ADDRESS = {
  label: '',
  recipientName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  landmark: '',
};

export default function CartDrawer() {
  const dispatch  = useDispatch<AppDispatch>();
  const navigate  = useNavigate();
  const location  = useLocation();

  const items       = useSelector(selectCartItems);
  const isOpen      = useSelector(selectCartOpen);
  const subtotal    = useSelector(selectCartTotal);
  const orderType   = useSelector(selectOrderType);

  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState(EMPTY_NEW_ADDRESS);
  const [activeTableAssignment, setActiveTableAssignment] = useState<TableAssignment | null>(null);
  const [tableAssignmentLoading, setTableAssignmentLoading] = useState(false);
  const [pendingTableRequest, setPendingTableRequest] = useState<TableRequest | null>(null);
  const [requestingTable, setRequestingTable] = useState(false);

  const tax   = subtotal * TAX_RATE;
  const total = subtotal + tax;

  useEffect(() => {
    const shouldReopen = sessionStorage.getItem('qb_reopen_cart') === '1';
    if (!shouldReopen) return;
    if (location.pathname === '/addresses') return;

    sessionStorage.removeItem('qb_reopen_cart');
    if (!isOpen) {
      dispatch(toggleCart());
    }
  }, [location.pathname, isOpen, dispatch]);

  useEffect(() => {
    if (!isOpen || orderType !== 'DELIVERY') return;

    const fetchAddresses = async () => {
      setAddressesLoading(true);
      try {
        const res = await api.get('/users/addresses');
        const data: Address[] = res.data.data ?? res.data;
        setAddresses(data);
        const defaultAddress = data.find(a => a.isDefault);
        setSelectedAddressId(defaultAddress?.id ?? data[0]?.id ?? '');
      } catch {
        toast.error('Failed to load saved addresses');
      } finally {
        setAddressesLoading(false);
      }
    };

    void fetchAddresses();
  }, [isOpen, orderType]);

  useEffect(() => {
    if (!isOpen || orderType !== 'FINE_DINE') return;

    const fetchAssignedTable = async () => {
      setTableAssignmentLoading(true);
      try {
        const res = await api.get('/table-assignments/me');
        const assignment: TableAssignment | null = res.data.data ?? res.data;
        setActiveTableAssignment(assignment);
      } catch {
        setActiveTableAssignment(null);
      } finally {
        setTableAssignmentLoading(false);
      }
    };

    // Check for pending table request
    const fetchPendingRequest = async () => {
      try {
        const res = await api.get('/table-requests/me');
        const request: TableRequest | null = res.data.data ?? res.data;
        setPendingTableRequest(request);
      } catch {
        setPendingTableRequest(null);
      }
    };

    void fetchAssignedTable();
    void fetchPendingRequest();

    // Auto-refresh assignment every 2 seconds while waiting for table
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!activeTableAssignment?.tableNumber && pendingTableRequest?.status === 'PENDING') {
      interval = setInterval(() => {
        void fetchAssignedTable();
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, orderType, activeTableAssignment?.tableNumber, pendingTableRequest?.status]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (orderType === 'FINE_DINE' && !activeTableAssignment?.tableNumber) {
      toast.error('No table assigned yet. Please contact host/staff.');
      return;
    }

    setLoading(true);
    try {
      let deliveryAddressId: string | undefined;

      if (orderType === 'DELIVERY') {
        if (showNewAddressForm) {
          if (!newAddress.line1.trim() || !newAddress.city.trim() || !newAddress.postalCode.trim()) {
            toast.error('Line 1, city and postal code are required for new delivery address');
            setLoading(false);
            return;
          }

          const created = await api.post('/users/addresses', {
            ...newAddress,
            line1: newAddress.line1.trim(),
            city: newAddress.city.trim(),
            postalCode: newAddress.postalCode.trim(),
            line2: newAddress.line2 || undefined,
            state: newAddress.state || undefined,
            landmark: newAddress.landmark || undefined,
            label: newAddress.label || undefined,
            recipientName: newAddress.recipientName || undefined,
            phone: newAddress.phone || undefined,
          });

          const createdAddress: Address = created.data.data ?? created.data;
          deliveryAddressId = createdAddress.id;
        } else {
          deliveryAddressId = selectedAddressId;
        }

        if (!deliveryAddressId) {
          toast.error('Please select a saved address or add a new one');
          setLoading(false);
          return;
        }
      }

      const payload = {
        items: items.map((item: CartItem) => ({
          menuItemId:     item.menuItemId,
          quantity:       item.quantity,
          customisations: item.customisations ?? {},
        })),
        orderType,
        deliveryAddressId: orderType === 'DELIVERY' ? deliveryAddressId : undefined,
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

  const handleRequestTable = async () => {
    setRequestingTable(true);
    try {
      const res = await api.post('/table-requests', {
        partySize: undefined,
        notes: undefined,
      });
      const request: TableRequest = res.data.data ?? res.data;
      setPendingTableRequest(request);
      toast.success('Table request sent! Waiting for staff to assign you a table...');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to request table';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setRequestingTable(false);
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ORDER_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => dispatch(setOrderType(type.value))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                        orderType === type.value
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-gray-200 text-gray-600 hover:border-orange-300'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assigned Table */}
              {orderType === 'FINE_DINE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Table
                  </label>
                  {tableAssignmentLoading ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500">
                      Checking assignment...
                    </div>
                  ) : activeTableAssignment?.tableNumber ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700">
                      {activeTableAssignment.tableNumber}
                    </div>
                  ) : pendingTableRequest?.status === 'PENDING' ? (
                    <div className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-blue-50 text-blue-600 flex items-center gap-2">
                      <Spinner size="xs" />
                      Waiting for table assignment...
                    </div>
                  ) : (
                    <button
                      onClick={handleRequestTable}
                      disabled={requestingTable}
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm bg-orange-50 text-orange-600 font-medium hover:bg-orange-100 transition disabled:opacity-50"
                    >
                      {requestingTable ? 'Requesting...' : 'Request Table'}
                    </button>
                  )}
                </div>
              )}

              {orderType === 'DELIVERY' && (
                <div className="space-y-3 rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          dispatch(toggleCart());
                          const returnTo = `${location.pathname}${location.search}`;
                          navigate(`/addresses?from=cart&returnTo=${encodeURIComponent(returnTo)}`);
                        }}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                      >
                        Manage
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewAddressForm(prev => !prev)}
                        className="text-xs font-semibold text-orange-500 hover:text-orange-600"
                      >
                        {showNewAddressForm ? 'Use Saved' : 'Add New'}
                      </button>
                    </div>
                  </div>

                  {!showNewAddressForm && (
                    <div className="space-y-2">
                      {addressesLoading ? (
                        <div className="flex justify-center py-3">
                          <Spinner size="sm" />
                        </div>
                      ) : addresses.length === 0 ? (
                        <p className="text-xs text-gray-500">No saved addresses yet. Use “Add New”.</p>
                      ) : (
                        addresses.map(address => (
                          <label
                            key={address.id}
                            className="flex gap-2 rounded-lg border border-gray-200 bg-white p-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="deliveryAddress"
                              checked={selectedAddressId === address.id}
                              onChange={() => setSelectedAddressId(address.id)}
                            />
                            <span className="text-xs text-gray-700">
                              <strong>{address.label || 'Saved Address'}</strong>
                              <br />
                              {address.line1}, {address.city} {address.postalCode}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  )}

                  {showNewAddressForm && (
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        type="text"
                        placeholder="Label (Home/Work)"
                        value={newAddress.label}
                        onChange={e => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <input
                        type="text"
                        placeholder="Address Line 1*"
                        value={newAddress.line1}
                        onChange={e => setNewAddress(prev => ({ ...prev, line1: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <input
                        type="text"
                        placeholder="Address Line 2"
                        value={newAddress.line2}
                        onChange={e => setNewAddress(prev => ({ ...prev, line2: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="City*"
                          value={newAddress.city}
                          onChange={e => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <input
                          type="text"
                          placeholder="Postal Code*"
                          value={newAddress.postalCode}
                          onChange={e => setNewAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

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