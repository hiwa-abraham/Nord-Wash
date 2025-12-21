export type UserRole = 'customer' | 'washer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  rating?: number;
  completedJobs?: number;
  createdAt: Date;
}

export type LaundryType = 'regular' | 'delicate' | 'heavy' | 'mixed';
export type ServiceType = 'wash' | 'wash-iron' | 'iron-only' | 'dry-clean';
export type RequestStatus = 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';

export interface LaundryRequest {
  id: string;
  customerId: string;
  customerName: string;
  washerId?: string;
  washerName?: string;
  title: string;
  description: string;
  laundryType: LaundryType;
  serviceType: ServiceType;
  weight: number; // in kg
  price: number;
  status: RequestStatus;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate: Date;
  deliveryDate?: Date;
  images?: string[];
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Date;
}

export interface ChatConversation {
  requestId: string;
  messages: Message[];
  participants: {
    customer: User;
    washer: User;
  };
}
