import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import  type { CartItem, OrderType } from '../../types';

interface CartState {
  items:       CartItem[];
  isOpen:      boolean;
  orderType:   OrderType;
}

const initialState: CartState = {
  items:       [],
  isOpen:      false,
  orderType:   'FINE_DINE',
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find(
        i => i.menuItemId === action.payload.menuItemId,
      );
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
    },

    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.menuItemId !== action.payload);
    },

    updateQuantity(
      state,
      action: PayloadAction<{ menuItemId: string; quantity: number }>,
    ) {
      const item = state.items.find(i => i.menuItemId === action.payload.menuItemId);
      if (item) {
        item.quantity = action.payload.quantity;
      }
    },

    clearCart(state) {
      state.items = [];
      state.orderType = 'FINE_DINE';
    },

    toggleCart(state) {
      state.isOpen = !state.isOpen;
    },

    setOrderType(state, action: PayloadAction<OrderType>) {
      state.orderType = action.payload;
    },
  },
});

export const {
  addItem, removeItem, updateQuantity,
  clearCart, toggleCart, setOrderType,
} = cartSlice.actions;

// ─── Selectors ────────────────────────────────────────

export const selectCartItems    = (state: any) => state.cart.items;
export const selectCartOpen     = (state: any) => state.cart.isOpen;
export const selectOrderType    = (state: any) => state.cart.orderType;

export const selectCartTotal = (state: any) =>
  state.cart.items.reduce(
    (sum: number, item: CartItem) => sum + item.price * item.quantity,
    0,
  );

export const selectCartCount = (state: any) =>
  state.cart.items.reduce(
    (sum: number, item: CartItem) => sum + item.quantity,
    0,
  );

export default cartSlice.reducer;