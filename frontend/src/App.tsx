import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getMeThunk, refreshThunk } from './features/auth/authSlice';
import type { AppDispatch, RootState } from './app/store';

import ProtectedRoute from './components/layout/ProtectedRoute';
import  Navbar  from './components/layout/Navbar';
import Spinner from './components/ui/Spinner';

import LoginPage from './features/auth/LoginPage';
import  RegisterPage from './features/auth/Register';
import MenuPage from './features/menu/MenuPage';
import OrdersPage from './features/orders/OrdersPage';
import OrderTrackingPage from './features/orders/OrderTrackingPage';
import KitchenPage from './features/kitchen/KitchenPage';
import AdminDashboard from './features/admin/AdminDashboard';
import AddressesPage from './features/profile/AddressesPage';
import CartDrawer from './features/cart/CartDrawer';

export default function App() {
  const dispatch   = useDispatch<AppDispatch>();
  const { restoring, user, accessToken } = useSelector((s: RootState) => s.auth);
  const roleHomePath = user?.role === 'STAFF' ? '/kitchen' : user?.role === 'ADMIN' ? '/admin' : '/';
  
  useEffect(() => {
    const restoreSession = async () => {
      const result = await dispatch(refreshThunk());
      if (refreshThunk.fulfilled.match(result)) {
        await dispatch(getMeThunk());
      }
    };

    void restoreSession();
  }, [dispatch]);

  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Navbar />
      <CartDrawer />
      <Routes>
        
        <Route path="/login"    element={accessToken ? <Navigate to={roleHomePath} replace /> : <LoginPage />} />
        <Route path="/register" element={accessToken ? <Navigate to={roleHomePath} replace /> : <RegisterPage />} />

        
        <Route path="/" element={
            <ProtectedRoute roles={['CUSTOMER', 'STAFF', 'ADMIN']}>
            {user?.role === 'STAFF' ? (
              <Navigate to="/kitchen" replace />
            ) : user?.role === 'ADMIN' ? (
              <Navigate to="/admin" replace />
            ) : (
              <MenuPage />
            )}
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
            <ProtectedRoute roles={['CUSTOMER']}>
            <OrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id" element={
            <ProtectedRoute roles={['CUSTOMER']}>
            <OrderTrackingPage />
          </ProtectedRoute>
        } />
        <Route path="/ops/orders/:id" element={
            <ProtectedRoute roles={['STAFF', 'ADMIN']}>
            <OrderTrackingPage />
          </ProtectedRoute>
        } />
        <Route path="/addresses" element={
            <ProtectedRoute roles={['CUSTOMER']}>
            <AddressesPage />
          </ProtectedRoute>
        } />

        
        <Route path="/kitchen" element={
          <ProtectedRoute roles={['STAFF', 'ADMIN']}>
            <KitchenPage />
          </ProtectedRoute>
        } />

        
        <Route path="/admin" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to={roleHomePath} replace />} />
      </Routes>
    </BrowserRouter>
  );
}