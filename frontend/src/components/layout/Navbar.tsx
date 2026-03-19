import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import type { AppDispatch } from '../../app/store';
import { toggleCart } from '../../features/cart/cardSlice';
import { selectCartCount } from '../../features/cart/cardSlice';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { PENDING_REFUND_COUNT_QUERY_KEY, usePendingRefundCount } from '../../hooks/usePendingRefundCount';

export default function Navbar() {
  const dispatch   = useDispatch<AppDispatch>();
  const { user, logout, isAdmin, isStaff } = useAuth();
  const cartCount  = useSelector(selectCartCount);
  const queryClient = useQueryClient();
  const socket = useSocket();

  const { data: pendingRefundCount = 0 } = usePendingRefundCount(isAdmin);

  useEffect(() => {
    if (!socket || !isAdmin) return;

    const refreshPendingCount = () => {
      queryClient.invalidateQueries({ queryKey: PENDING_REFUND_COUNT_QUERY_KEY });
    };

    socket.on('order:new', refreshPendingCount);
    socket.on('order:statusUpdated', refreshPendingCount);
    socket.on('payment:refundPending', refreshPendingCount);
    socket.on('payment:refunded', refreshPendingCount);

    return () => {
      socket.off('order:new', refreshPendingCount);
      socket.off('order:statusUpdated', refreshPendingCount);
      socket.off('payment:refundPending', refreshPendingCount);
      socket.off('payment:refunded', refreshPendingCount);
    };
  }, [socket, isAdmin, queryClient]);

  if (!user) return null; // hide navbar on login/register

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-orange-500">
          🍽 QuickBite
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
          {!isStaff && !isAdmin && (
            <>
              <Link to="/" className="hover:text-orange-500 transition">Menu</Link>
              <Link to="/orders" className="hover:text-orange-500 transition">My Orders</Link>
            </>
          )}
          {!isStaff && !isAdmin && (
            <Link to="/addresses" className="hover:text-orange-500 transition">Address Book</Link>
          )}
          {(isStaff || isAdmin) && (
            <Link to="/kitchen" className="hover:text-orange-500 transition">Kitchen</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="hover:text-orange-500 transition">
              <span className="relative inline-flex items-center">
                Admin
                {pendingRefundCount > 0 && (
                  <span className="ml-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingRefundCount > 9 ? '9+' : pendingRefundCount}
                  </span>
                )}
              </span>
            </Link>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Cart Button — customers only */}
          {!isStaff && !isAdmin && (
            <button
              onClick={() => dispatch(toggleCart())}
              className="relative p-2 rounded-lg hover:bg-orange-50 transition"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white
                                 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.name}</span>
            <button
              onClick={logout}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
