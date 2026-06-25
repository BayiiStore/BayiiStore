export interface DeliveryContent {
  type: 'file' | 'text' | 'both';
  apkUrl?: string;
  zipUrl?: string;
  tutorialVideo?: string;
  textContent?: string;
}

export interface Product {
  id: string;
  firestoreId?: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  itemSatisUrl: string;
  price: number;
  stockStatus: 'var' | 'yok';
  deliveryContent: DeliveryContent;
  rating?: number; // 1-10 average
  ratingCount?: number;
  createdAt: number;
}

export interface StockCode {
  id: string;
  code: string;
  productId: string;
  used: boolean;
  usedBy?: string;
  usedAt?: number;
}

export interface Claim {
  id: string;
  userId: string;
  userEmail: string;
  productId: string;
  productName: string;
  stockCode: string; // If 'MANUAL_PENDING', it's waiting for approval
  claimedAt: number;
  deliveryContent: DeliveryContent;
  receiptImage?: string; // base64 dekont
  status?: 'pending' | 'approved' | 'rejected';
  customerName?: string; // Bank account name
}

export interface UserProfile {
  uid: string;
  email: string;
  bankFullName: string;
  role: 'user' | 'admin';
  createdAt: number;
}

export interface Comment {
  id: string;
  productId: string;
  userId: string;
  userEmail: string;
  rating: number; // 1-10 scale
  comment: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string; // 'all' or specific userId
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert';
  createdAt: number;
  readBy?: string[]; // Array of userIds who read it
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: number;
}

export interface SupportRequest {
  id: string;
  name: string;
  contact: string;
  message: string;
  createdAt: number;
  status: 'bekliyor' | 'cozuldu';
}
