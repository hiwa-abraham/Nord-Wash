/**
 * useServices.ts - Service Management Hook
 * 
 * This hook manages laundry service offerings for the platform.
 * Services define what types of laundry work are available and their pricing.
 * 
 * Data Persistence:
 * - Uses Supabase for persistence
 * - Admin-only write access via RLS policies
 * 
 * Features:
 * - CRUD operations for services (admin only)
 * - Read access for all authenticated users
 * - Real-time updates when services change
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Service {
  id: string;
  name: string;
  description: string;
  pricePerKg: number;       // Price in euros (converted from cents in DB)
  discountPercent: number;
  isActive: boolean;
}

interface DbService {
  id: string;
  name: string;
  description: string;
  price_per_kg: number;     // Price in cents
  discount_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database service to frontend format
 */
function dbToService(db: DbService): Service {
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    pricePerKg: db.price_per_kg / 100, // Convert cents to euros
    discountPercent: db.discount_percent,
    isActive: db.is_active,
  };
}

/**
 * Custom hook for managing laundry services.
 * 
 * @returns Object containing services array, filtered active services, and CRUD methods
 */
export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches all services from the database
   */
  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    } else {
      setServices((data || []).map(dbToService));
    }
    setIsLoading(false);
  }, []);

  // Fetch services on mount
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  /**
   * Adds a new service to the catalog (Admin only).
   * 
   * @param service - Service data without ID (ID will be generated)
   */
  const addService = async (service: Omit<Service, 'id'>) => {
    const { data, error } = await supabase
      .from('services')
      .insert({
        name: service.name,
        description: service.description,
        price_per_kg: Math.round(service.pricePerKg * 100), // Convert to cents
        discount_percent: service.discountPercent,
        is_active: service.isActive,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service. Admin access required.');
      return false;
    }
    
    setServices(prev => [...prev, dbToService(data)]);
    toast.success('Service added successfully');
    return true;
  };

  /**
   * Updates an existing service (Admin only).
   * 
   * @param id - ID of the service to update
   * @param updates - Partial service data to merge
   */
  const updateService = async (id: string, updates: Partial<Service>) => {
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.pricePerKg !== undefined) dbUpdates.price_per_kg = Math.round(updates.pricePerKg * 100);
    if (updates.discountPercent !== undefined) dbUpdates.discount_percent = updates.discountPercent;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { error } = await supabase
      .from('services')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating service:', error);
      toast.error('Failed to update service. Admin access required.');
      return false;
    }

    setServices(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
    toast.success('Service updated successfully');
    return true;
  };

  /**
   * Removes a service from the catalog (Admin only).
   * 
   * @param id - ID of the service to remove
   */
  const removeService = async (id: string) => {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing service:', error);
      toast.error('Failed to remove service. Admin access required.');
      return false;
    }

    setServices(prev => prev.filter(s => s.id !== id));
    toast.success('Service removed successfully');
    return true;
  };

  /**
   * Toggles a service's active status (Admin only).
   * 
   * @param id - ID of the service to toggle
   */
  const toggleServiceActive = async (id: string) => {
    const service = services.find(s => s.id === id);
    if (!service) return false;

    return updateService(id, { isActive: !service.isActive });
  };

  return {
    services,
    activeServices: services.filter(s => s.isActive),
    isLoading,
    addService,
    updateService,
    removeService,
    toggleServiceActive,
    refetch: fetchServices,
  };
}
