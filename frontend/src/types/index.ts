export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type OrderType = 'FINE_DINE' | 'PICKUP' | 'DELIVERY';

export type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PREPARING'
  | 'READY'   | 'SERVED'    | 'COMPLETED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'CARD';

export interface User {
  id:        string;
  email:     string;
  name:      string;
  phone?:    string;
  role:      Role;
  createdAt: string;
}

export interface Address {
  id: string;
  label?: string;
  recipientName?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  landmark?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
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
  stockQty:             number;  // -1 = unlimited
  is86d:                boolean; // out
  availableFrom?:       string | null;
  availableTo?:         string | null;
  prepTimeMins:         number;
  customisationOptions: Record<string, string[]>;
  category:             { id: string; name: string };
  deletedAt?:           string | null;
  _count?:              { orderItems: number };
}

export interface OrderItem {
  id:               string;
  menuItemId:       string;
  quantity:         number;
  unitPrice:        string;
  itemNameSnapshot: string;
  customisations:   Record<string, string>;
  menuItem?:        { id: string; name: string; imageUrl?: string };
}

export interface Order {
  id:          string;
  orderNumber: string;
  status:      OrderStatus;
  orderType:   OrderType;
  tableNumber?: string;
  deliveryAddressId?: string;
  deliveryAddressSnapshot?: {
    id: string;
    label?: string;
    recipientName?: string;
    phone?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    landmark?: string;
  };
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

export interface TableAssignment {
  id: string;
  userId: string;
  tableNumber: string;
  status: 'ACTIVE' | 'RELEASED';
  assignedAt: string;
  assignedBy?: {
    id: string;
    name: string;
  };
}

export interface TableRequest {
  id: string;
  userId: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  partySize?: number;
  notes?: string;
  requestedAt: string;
  user?: {
    id: string;
    name: string;
    phone?: string;
    email: string;
  };
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