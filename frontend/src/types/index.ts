export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PREPARING'
  | 'READY'   | 'SERVED'    | 'COMPLETED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'CARD' | 'QR';

export interface User {
  id:        string;
  email:     string;
  name:      string;
  phone?:    string;
  role:      Role;
  createdAt: string;
}

export interface Category {
  id:           string;
  name:         string;
  description?: string;
  displayOrder: number;
  isActive:     boolean;
}

export interface MenuItem {
  id:                   string;
  name:                 string;
  description?:         string;
  price:                string;
  imageUrl?:            string;
  isAvailable:          boolean;
  prepTimeMins:         number;
  customisationOptions: Record<string, string[]>;
  category:             { id: string; name: string };
}

export interface OrderItem {
  id:               string;
  quantity:         number;
  unitPrice:        string;
  itemNameSnapshot: string;
  customisations:   Record<string, string[]>;
  menuItem?:        { id: string; name: string; imageUrl?: string };
}

export interface Order {
  id:          string;
  orderNumber: string;
  status:      OrderStatus;
  tableNumber?: string;
  subtotal:    string;
  tax:         string;
  total:       string;
  notes?:      string;
  orderItems:  OrderItem[];
  payment?:    Payment;
  user:        { id: string; name: string; email: string };
  createdAt:   string;
}

export interface Payment {
  id:             string;
  amount:         string;
  method:         PaymentMethod;
  status:         string;
  transactionRef?: string;
  paidAt?:        string;
}

// Cart types — frontend only
export interface CartItem {
  menuItemId:      string;
  name:            string;
  price:           number;
  quantity:        number;
  imageUrl?:       string;
  customisations?: Record<string, string>;
}