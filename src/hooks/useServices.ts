/**
 * useServices.ts - Service Management Hook
 *
 * Loads and persists laundry services from the Supabase `services` table.
 * Admins can add/update/remove/toggle services; changes sync to the DB.
 *
 * Returns:
 * - services: all services (admins see everything; non-admins only see active via RLS)
 * - activeServices: filtered active services
 * - loading: initial load state
 * - CRUD methods (async)
 */

import { useCallback, useEffect, useState } from 'react';
import { Service } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DbServiceRow = {
  id: string;
  name: string;
  name_key: string | null;
  description: string;
  price_per_kg: number;
  discount_percent: number;
  is_active: boolean;
  currency?: string | null;
};

const fromDb = (r: DbServiceRow): Service => ({
  id: r.id,
  name: r.name,
  nameKey: r.name_key,
  description: r.description,
  pricePerKg: Number(r.price_per_kg),
  discountPercent: Number(r.discount_percent),
  isActive: r.is_active,
  currency: r.currency || 'SEK',
});

const toDb = (s: Partial<Omit<Service, 'id'>>) => {
  const row: Record<string, unknown> = {};
  if (s.name !== undefined) row.name = s.name;
  if (s.nameKey !== undefined) row.name_key = s.nameKey;
  if (s.description !== undefined) row.description = s.description;
  if (s.pricePerKg !== undefined) row.price_per_kg = s.pricePerKg;
  if (s.discountPercent !== undefined) row.discount_percent = s.discountPercent;
  if (s.isActive !== undefined) row.is_active = s.isActive;
  if (s.currency !== undefined) row.currency = s.currency;
  return row;
};

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to load services');
      setServices([]);
    } else {
      setServices((data as DbServiceRow[]).map(fromDb));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const addService = async (service: Omit<Service, 'id'>) => {
    const { data, error } = await supabase
      .from('services')
      .insert(toDb(service) as never)
      .select()
      .single();

    if (error) {
      toast.error('Failed to add service');
      return;
    }
    setServices((prev) => [...prev, fromDb(data as DbServiceRow)]);
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    const { data, error } = await supabase
      .from('services')
      .update(toDb(updates) as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update service');
      return;
    }
    setServices((prev) =>
      prev.map((s) => (s.id === id ? fromDb(data as DbServiceRow) : s))
    );
  };

  const removeService = async (id: string) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      toast.error('Failed to remove service');
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleServiceActive = async (id: string) => {
    const current = services.find((s) => s.id === id);
    if (!current) return;
    await updateService(id, { isActive: !current.isActive });
  };

  return {
    services,
    activeServices: services.filter((s) => s.isActive),
    loading,
    addService,
    updateService,
    removeService,
    toggleServiceActive,
    refetch: fetchServices,
  };
}
