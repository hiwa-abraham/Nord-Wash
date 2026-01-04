/**
 * useOrdersRealtime - Real-time orders subscription hook
 * 
 * Provides real-time updates for orders, filtering by customer or washer ID.
 * Integrates with push notifications for native app support.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getOrderStatusNotification } from './usePushNotifications';

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
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    setIsLoading(false);
  }, [userId, role]);

  useEffect(() => {
    if (!userId || !enabled) return;

    fetchOrders();

    // Set up realtime subscription
    const channel = supabase
      .channel(`orders-${role}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const newOrder = payload.new as Order;
          const isRelevant = role === 'customer' 
            ? newOrder.customer_id === userId 
            : newOrder.washer_id === userId;
          
          if (isRelevant) {
            console.log('New order received:', newOrder.id);
            setOrders(prev => [newOrder, ...prev]);
            toast.success('New order received!');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          const isRelevant = role === 'customer' 
            ? updatedOrder.customer_id === userId 
            : updatedOrder.washer_id === userId;
          
          if (isRelevant) {
            console.log('Order updated:', updatedOrder.id, 'Status:', updatedOrder.status);
            setOrders(prev => 
              prev.map(order => 
                order.id === updatedOrder.id ? updatedOrder : order
              )
            );
            
            // Show status change notification
            const oldOrder = orders.find(o => o.id === updatedOrder.id);
            if (oldOrder && oldOrder.status !== updatedOrder.status) {
              const notification = getOrderStatusNotification(updatedOrder.status);
              
              if (notification) {
                // Show toast for in-app notification
                toast.info(notification.title, {
                  description: notification.body,
                });
                
                // Send local notification for native apps (works in background)
                if (Capacitor.isNativePlatform()) {
                  LocalNotifications.schedule({
                    notifications: [{
                      id: Date.now(),
                      title: notification.title,
                      body: notification.body,
                      extra: { orderId: updatedOrder.id },
                    }],
                  }).catch(err => console.error('Local notification error:', err));
                }
              } else {
                toast.info(`Order status: ${updatedOrder.status}`);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const deletedOrder = payload.old as Order;
          console.log('Order deleted:', deletedOrder.id);
          setOrders(prev => prev.filter(order => order.id !== deletedOrder.id));
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, role, enabled, fetchOrders]);

  return { orders, isLoading, refetch: fetchOrders };
}
