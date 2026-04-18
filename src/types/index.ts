/**
 * types/index.ts - TypeScript Type Definitions
 * 
 * This file contains all shared type definitions for the FreshFold platform.
 * These types are used throughout the frontend for type safety.
 * 
 * Note: Database types are auto-generated in integrations/supabase/types.ts
 * This file contains application-level types that may not directly map to DB.
 */

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * User roles in the application.
 * Note: 'admin' role exists in database but is managed separately.
 */
export type UserRole = 'customer' | 'washer';

/**
 * User entity representing a platform user.
 * This is an application-level type - actual user data is in Supabase Auth
 * and the profiles table.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;        // Only visible to admins
  rating?: number;       // Washer rating (1-5)
  completedJobs?: number; // Washer's job count
  createdAt: Date;
}

// ============================================================================
// LAUNDRY REQUEST TYPES
// ============================================================================

/**
 * Types of laundry that can be submitted.
 * Affects pricing and handling instructions.
 */
export type LaundryType = 'regular' | 'delicate' | 'heavy' | 'mixed';

/**
 * Service types available for laundry.
 * Each has different pricing defined in the services catalog.
 */
export type ServiceType = 'wash' | 'wash-iron' | 'iron-only' | 'dry-clean';

/**
 * Lifecycle status of a laundry request.
 * 
 * Flow: pending -> accepted -> in-progress -> completed
 *       pending -> cancelled (customer can cancel before acceptance)
 */
export type RequestStatus = 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';

/**
 * Laundry request entity - core business object.
 * Represents a customer's request for laundry service.
 * 
 * TODO: This should be moved to a Supabase table for persistence.
 */
export interface LaundryRequest {
  id: string;
  customerId: string;          // References auth.users
  customerName: string;        // Denormalized for display
  washerId?: string;           // Assigned washer (null when pending)
  washerName?: string;         // Denormalized for display
  title: string;               // Brief description
  description: string;         // Detailed instructions
  laundryType: LaundryType;
  serviceType: ServiceType;
  weight: number;              // Estimated weight in kg
  price: number;               // Calculated price
  status: RequestStatus;
  pickupAddress: string;       // Where to collect laundry
  deliveryAddress: string;     // Where to return laundry
  pickupDate: Date;            // Scheduled pickup time
  deliveryDate?: Date;         // Expected delivery time
  images?: string[];           // Optional photos of items
  specialInstructions?: string; // Care instructions
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// MESSAGING TYPES
// ============================================================================

/**
 * Chat message entity.
 * Note: Database schema uses snake_case (sender_id, created_at)
 * This interface uses camelCase for frontend consistency.
 */
export interface Message {
  id: string;
  requestId: string;           // Links to laundry request
  senderId: string;            // Who sent the message
  senderName: string;          // Display name (denormalized)
  content: string;             // Message text
  createdAt: Date;
}

/**
 * Chat conversation with message history.
 * Groups messages between a customer and washer.
 */
export interface ChatConversation {
  requestId: string;           // The order this conversation is about
  messages: Message[];
  participants: {
    customer: User;
    washer: User;
  };
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

/**
 * Service entity - defines a type of laundry service.
 * Admin can manage these through the admin panel.
 * 
 * Currently stored in localStorage via useServices hook.
 * TODO: Migrate to Supabase table for admin management.
 */
export interface Service {
  id: string;
  name: string;                // Service name (e.g., "Wash & Iron")
  nameKey?: string | null;     // Optional i18n key (e.g. "wash_iron") for translated name/description
  description: string;         // What's included
  pricePerKg: number;          // Base price per kilogram
  discountPercent: number;     // Current discount (0-100)
  isActive: boolean;           // Whether service is available
}
