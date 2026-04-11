/**
 * useOrdersRealtime - Real-time orders subscription hook
 * 
 * Provides real-time updates for orders, filtering by customer or washer ID.
 * Integrates with push notifications for native app support.
 * 
 * Security: Uses secure logging to prevent PII leakage
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getOrderStatusNotification } from './usePushNotifications';
import { secureLog, truncateId } from '@/lib/secure-logger';

type Order = Tables<'orders'>;

interface UseOrdersRealtimeOptions {
  userId: string | undefined;
  role: 'customer' | 'washer';
  enabled?: boolean;
}

export function useOrdersRealtime({ userId, role, enabled = true }: UseOrdersRealtimeOptions) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial orders
  const fetchOrders = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    const column = role === 'customer' ? 'customer_id' : 'washer_id';
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq(column, userId)
      .order('created_at', { ascending: false });

    if (error) {
      secureLog.error('Error fetching orders:', error.message);
    } else {
      setOrders(data || []);
    }
    setIsLoading(false);
  }, [userId, role]);

  useEffect(() => {
    if (!userId || !enabled) return;

    fetchOrders();

    // Poll for updates every 15 seconds instead of using Realtime broadcast
    // (orders table removed from Realtime publication to prevent PII leakage)
    const interval = setInterval(() => {
      fetchOrders();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [userId, role, enabled, fetchOrders]);

  return { orders, isLoading, refetch: fetchOrders };
}
