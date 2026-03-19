import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../app/store';
import { toggleCart } from '../../features/cart/cardSlice';
import { selectCartCount } from '../../features/cart/cardSlice';
import { useAuth } from '../../hooks/useAuth';

export default function Navbar() {
  const dispatch   = useDispatch<AppDispatch>();
  const { user, logout, isAdmin, isStaff } = useAuth();
  const cartCount  = useSelector(selectCartCount);

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
          <Link to="/" className="hover:text-orange-500 transition">Menu</Link>
          <Link to="/orders" className="hover:text-orange-500 transition">My Orders</Link>
          {!isStaff && !isAdmin && (
            <Link to="/addresses" className="hover:text-orange-500 transition">Address Book</Link>
          )}
          {(isStaff || isAdmin) && (
            <Link to="/kitchen" className="hover:text-orange-500 transition">Kitchen</Link>
          )}
          {(isStaff || isAdmin) && (
            <Link to="/table-assignments" className="hover:text-orange-500 transition">Assign Tables</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="hover:text-orange-500 transition">Admin</Link>
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
