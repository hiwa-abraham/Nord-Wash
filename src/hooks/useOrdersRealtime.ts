/**
 * useOrdersRealtime - Real-time orders subscription hook
 * 
 * Provides real-time updates for orders, filtering by customer or washer ID.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

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
              const statusMessages: Record<string, string> = {
                paid: 'Order has been paid!',
                assigned: 'A washer has been assigned!',
                in_progress: 'Your laundry is being processed!',
                completed: 'Order completed!',
                cancelled: 'Order was cancelled.',
              };
              const message = statusMessages[updatedOrder.status] || `Order status: ${updatedOrder.status}`;
              toast.info(message);
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
