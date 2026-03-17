export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Storing password for demo purposes only (insecure in real app)
  phone?: string;
  dob?: string;
  role: 'admin' | 'buyer' | 'seller';
  verifiedPhoto?: string;
  documentType?: string;
  documentPhoto?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  issueType: string;
  message: string;
  date: string;
  status: 'new' | 'read' | 'resolved';
}

export interface Product {
  id: number;
  title: string;
  category?: string;
  image: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating?: string;
  reviews?: number;
  description?: string;
  location?: string;
  status?: 'approved' | 'pending' | 'rejected';
  sellerId?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
