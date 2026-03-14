import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import  type { CartItem } from '../../types';

interface CartState {
  items:       CartItem[];
  isOpen:      boolean;
  tableNumber: string;
}

const initialState: CartState = {
  items:       [],
  isOpen:      false,
  tableNumber: '',
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
    },

    toggleCart(state) {
      state.isOpen = !state.isOpen;
    },

    setTableNumber(state, action: PayloadAction<string>) {
      state.tableNumber = action.payload;
    },
  },
});

export const {
  addItem, removeItem, updateQuantity,
  clearCart, toggleCart, setTableNumber,
} = cartSlice.actions;

// ─── Selectors ────────────────────────────────────────

export const selectCartItems    = (state: any) => state.cart.items;
export const selectCartOpen     = (state: any) => state.cart.isOpen;
export const selectTableNumber  = (state: any) => state.cart.tableNumber;

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