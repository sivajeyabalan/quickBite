import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import api from '../../api/axios';
import type { Order, OrderStatus } from '../../types';
import { addItem, toggleCart } from '../cart/cardSlice'
import type { AppDispatch } from '../../app/store';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100   text-blue-700',
  PREPARING: 'bg-purple-100 text-purple-700',
  READY:     'bg-green-100  text-green-700',
  SERVED:    'bg-teal-100   text-teal-700',
  COMPLETED: 'bg-gray-100   text-gray-600',
  CANCELLED: 'bg-red-100    text-red-600',
};

const fetchOrders = async (): Promise<Order[]> => {
  const res = await api.get('/orders');
  return res.data.data ?? res.data;
};

export default function OrdersPage() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch<AppDispatch>();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn:  fetchOrders,
  });

  const handleReorder = (order: Order) => {
    order.orderItems.forEach(item => {
      dispatch(addItem({
        menuItemId: item.menuItemId,
        name:       item.itemNameSnapshot,
        price:      Number(item.unitPrice),
        quantity:   item.quantity,
        imageUrl:   item.menuItem?.imageUrl,
        customisations: item.customisations ?? {},
      }));
    });
    dispatch(toggleCart());
    toast.success('Items added to cart');
  };

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No orders yet</p>
          <p className="text-sm mt-1">Place your first order from the menu</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="font-bold text-gray-800">{order.orderNumber}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleString()} ·
                    Table {order.tableNumber || 'N/A'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold
                                  ${STATUS_COLORS[order.status]}`}>
                  {order.status}
                </span>
              </div>

              {/* Items Summary */}
              <div className="text-sm text-gray-600 space-y-0.5 mb-3">
                {order.orderItems.slice(0, 3).map(item => (
                  <p key={item.id}>
                    {item.quantity}× {item.itemNameSnapshot}
                  </p>
                ))}
                {order.orderItems.length > 3 && (
                  <p className="text-gray-400">
                    +{order.orderItems.length - 3} more items
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center pt-3
                              border-t border-gray-100">
                <span className="font-bold text-orange-500">
                  ${Number(order.total).toFixed(2)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReorder(order)}
                    className="text-xs px-3 py-1.5 border border-orange-400
                               text-orange-500 rounded-lg hover:bg-orange-50 transition"
                  >
                    Reorder
                  </button>
                  <button
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="text-xs px-3 py-1.5 bg-orange-500 text-white
                               rounded-lg hover:bg-orange-600 transition"
                  >
                    Track
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
