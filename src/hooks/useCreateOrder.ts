/**
 * useCreateOrder Hook
 * 
 * Handles order creation with payment processing and idempotency.
 * Creates orders in the database with proper payment distribution:
 * - Service fee ($5) goes to owner
 * - 10% of services goes to owner
 * - 90% of services + transport fee ($10) goes to washer
 * 
 * Features:
 * - Idempotency: Prevents duplicate orders during network issues
 * - Rate limiting: Prevents spam order creation
 * - Validation: Server-side validation of order data
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { PaymentMethod } from '@/components/payment/PaymentStep';
import { 
  generateIdempotencyKey, 
  checkIdempotencyKey, 
  setIdempotencyPending,
  setIdempotencyCompleted,
  setIdempotencyFailed 
} from '@/lib/idempotency';
import { rateLimitPresets } from '@/lib/rate-limit';

// ============================================
// Types
// ============================================

/** Service selection structure */
interface ServiceSelection {
  serviceId: string;
  serviceName: string;
  quantity: number;
  pricePerKg: number;
  totalPrice: number;
}

/** Contact details structure */
interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  specialInstructions: string;
}

/** Order creation parameters */
interface CreateOrderParams {
  services: ServiceSelection[];
  servicesTotal: number;
  pickupDate: Date;
  pickupTime: string;
  contactDetails: ContactDetails;
  paymentMethod: PaymentMethod;
}

// ============================================
// Constants
// ============================================

/** Service fee in cents */
const SERVICE_FEE_CENTS = 500; // $5.00

/** Transport fee in cents */
const TRANSPORT_FEE_CENTS = 1000; // $10.00

/** Owner's percentage of service revenue */
const OWNER_PERCENTAGE = 10;

/** Washer's percentage of service revenue */
const WASHER_PERCENTAGE = 90;

// ============================================
// Hook
// ============================================

export function useCreateOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track current idempotency key to prevent duplicate submissions
  const currentKeyRef = useRef<string | null>(null);

  /**
   * Create a new order with payment
   * Includes idempotency protection and rate limiting
   * @param params - Order creation parameters
   * @returns Created order ID or null on failure
   */
  const createOrder = async (params: CreateOrderParams): Promise<string | null> => {
    // Validate user is authenticated
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to create an order.',
        variant: 'destructive',
      });
      navigate('/auth');
      return null;
    }

    // Rate limit check
    const rateLimitResult = rateLimitPresets.paymentOperation(`order_${user.id}`);
    if (rateLimitResult.limited) {
      toast({
        title: 'Too Many Requests',
        description: `Please wait ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds before trying again.`,
        variant: 'destructive',
      });
      return null;
    }

    // Generate idempotency key based on order details
    const idempotencyKey = generateIdempotencyKey(user.id, 'create_order', {
      services: params.services.map(s => s.serviceId).sort(),
      pickupDate: params.pickupDate.toISOString().split('T')[0],
      pickupTime: params.pickupTime,
      email: params.contactDetails.email,
    });

    // Check for existing operation
    const existingOperation = checkIdempotencyKey(idempotencyKey);
    if (existingOperation) {
      if (existingOperation.status === 'pending') {
        toast({
          title: 'Order In Progress',
          description: 'Your order is already being processed. Please wait.',
        });
        return null;
      }
      if (existingOperation.status === 'completed' && existingOperation.resultId) {
        toast({
          title: 'Order Already Created',
          description: 'This order was already submitted successfully.',
        });
        return existingOperation.resultId;
      }
    }

    // Prevent duplicate submissions while processing
    if (currentKeyRef.current) {
      toast({
        title: 'Please Wait',
        description: 'An order is already being processed.',
      });
      return null;
    }

    setIsProcessing(true);
    setError(null);
    currentKeyRef.current = idempotencyKey;
    setIdempotencyPending(idempotencyKey);

    try {
      // Convert services total to cents
      const servicesTotalCents = Math.round(params.servicesTotal * 100);
      
      // Calculate total amount
      const totalAmountCents = servicesTotalCents + SERVICE_FEE_CENTS + TRANSPORT_FEE_CENTS;
      
      // Calculate payment distribution
      // Owner gets: service fee + 10% of services
      const ownerAmountCents = SERVICE_FEE_CENTS + Math.round(servicesTotalCents * OWNER_PERCENTAGE / 100);
      
      // Washer gets: 90% of services + transport fee
      const washerAmountCents = Math.round(servicesTotalCents * WASHER_PERCENTAGE / 100) + TRANSPORT_FEE_CENTS;

      // Prepare order data - cast services to Json type
      const orderData = {
        customer_id: user.id,
        // Service items as JSONB (cast to unknown then to expected type)
        services: params.services as unknown as Record<string, unknown>[],
        // Pickup info
        pickup_date: params.pickupDate.toISOString().split('T')[0],
        pickup_time: params.pickupTime,
        // Contact info
        customer_name: params.contactDetails.name,
        customer_email: params.contactDetails.email,
        customer_phone: params.contactDetails.phone,
        pickup_address: params.contactDetails.address,
        pickup_city: params.contactDetails.city,
        pickup_postal_code: params.contactDetails.postalCode || null,
        special_instructions: params.contactDetails.specialInstructions || null,
        // Pricing (in cents)
        services_total: servicesTotalCents,
        service_fee: SERVICE_FEE_CENTS,
        transport_fee: TRANSPORT_FEE_CENTS,
        total_amount: totalAmountCents,
        // Payment distribution (in cents)
        owner_amount: ownerAmountCents,
        washer_amount: washerAmountCents,
        // Payment info
        payment_method: params.paymentMethod,
        // Status based on payment method
        status: 'pending_payment' as const,
        payment_status: 'pending' as const,
      };

      // Geocode pickup address (best-effort; do not block order on failure)
      let pickup_latitude: number | null = null;
      let pickup_longitude: number | null = null;
      try {
        const fullAddress = `${params.contactDetails.address}, ${params.contactDetails.city}${params.contactDetails.postalCode ? `, ${params.contactDetails.postalCode}` : ''}`;
        const { data: geo } = await supabase.functions.invoke('geocode-address', {
          body: { address: fullAddress },
        });
        if (geo?.lat && geo?.lng) {
          pickup_latitude = Number(geo.lat);
          pickup_longitude = Number(geo.lng);
        }
      } catch {
        // ignore — coords are optional
      }

      // Insert order into database (wrap in array for Supabase insert)
      const { data: order, error: insertError } = await supabase
        .from('orders')
        .insert([{ ...orderData, pickup_latitude, pickup_longitude }] as never)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Mark idempotency key as completed
      setIdempotencyCompleted(idempotencyKey, order.id);

      // Show success message
      toast({
        title: 'Order Created!',
        description: params.paymentMethod === 'bank_transfer'
          ? 'Please complete the bank transfer to confirm your pickup.'
          : 'Your order has been created. Payment processing will be available soon.',
      });

      return order.id;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order';
      setError(message);
      
      // Mark idempotency as failed so user can retry
      setIdempotencyFailed(idempotencyKey);
      
      toast({
        title: 'Order Failed',
        description: message,
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsProcessing(false);
      currentKeyRef.current = null;
    }
  };

  return {
    createOrder,
    isProcessing,
    error,
  };
}
