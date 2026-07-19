export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  role?: string;
  username?: string;
  created_at?: string;
  raw_user_meta_data?: any;
  app_metadata?: any;
}

export interface ConsoleLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface SqlTemplate {
  id: string;
  title: string;
  description: string;
  sql: string;
}

export interface Project {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  mediaUrl: string;
  price: number; // in IQD
  isDeal: boolean;
  discountPrice?: number; // in IQD
  isVideo: boolean;
}

export interface Order {
  id: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  orderName: string; // project names concatenated
  totalPrice: number; // in IQD
  created_at: string;
  status: 'pending' | 'approved' | 'cancelled';
}

export interface User {
  id: string;
  username: string;
  password?: string;
  email: string;
  phone: string;
  address: string;
  role: 'admin' | 'user';
}
