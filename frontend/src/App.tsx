import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getMeThunk } from './features/auth/authSlice';
import type { AppDispatch, RootState } from './app/store';

import ProtectedRoute from './components/layout/ProtectedRoute';
import  Navbar  from './components/layout/Navbar';

import LoginPage from './features/auth/LoginPage';
import  RegisterPage from './features/auth/Register';
import MenuPage from './features/menu/MenuPage';
import OrdersPage from './features/orders/OrdersPage';
import OrderTrackingPage from './features/orders/OrderTrackingPage';
import KitchenPage from './features/kitchen/KitchenPage';
import AdminDashboard from './features/admin/AdminDashboard';
import CartDrawer from './features/cart/CartDrawer';

export default function App() {
  const dispatch   = useDispatch<AppDispatch>();
  const { accessToken } = useSelector((s: RootState) => s.auth);

  // On app load — try to restore session via refresh cookie
  useEffect(() => {
    if (accessToken) {
      dispatch(getMeThunk());
    }
  }, [accessToken]);

  return (
    <BrowserRouter>
      <Navbar />
      <CartDrawer />
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Customer */}
        <Route path="/" element={
          <ProtectedRoute roles={['CUSTOMER', 'STAFF', 'ADMIN']}>
            <MenuPage />
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute roles={['CUSTOMER', 'STAFF', 'ADMIN']}>
            <OrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id" element={
          <ProtectedRoute roles={['CUSTOMER', 'STAFF', 'ADMIN']}>
            <OrderTrackingPage />
          </ProtectedRoute>
        } />

        {/* Staff */}
        <Route path="/kitchen" element={
          <ProtectedRoute roles={['STAFF', 'ADMIN']}>
            <KitchenPage />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}