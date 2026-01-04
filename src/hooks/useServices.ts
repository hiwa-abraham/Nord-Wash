/**
 * useServices.ts - Service Management Hook
 * 
 * This hook manages laundry service offerings for the platform.
 * Services define what types of laundry work are available and their pricing.
 * 
 * Data Persistence:
 * - Currently uses localStorage for persistence
 * - TODO: Migrate to Supabase table when orders functionality is built
 * 
 * Features:
 * - CRUD operations for services
 * - Toggle service active/inactive status
 * - Automatic persistence to localStorage
 * - Default services provided on first load
 * 
 * Usage:
 * ```tsx
 * const { services, activeServices, addService, updateService, removeService, toggleServiceActive } = useServices();
 * ```
 */

import { useState, useEffect } from 'react';
import { Service } from '@/types';

// localStorage key for service data persistence
const STORAGE_KEY = 'laundry-services';

/**
 * Default services provided when no saved services exist.
 * These represent the core laundry offerings of the platform.
 */
const defaultServices: Service[] = [
  {
    id: 'service-1',
    name: 'Regular Wash',
    description: 'Standard washing for everyday clothes',
    pricePerKg: 4,
    discountPercent: 0,
    isActive: true,
  },
  {
    id: 'service-2',
    name: 'Wash & Iron',
    description: 'Washing with professional ironing',
    pricePerKg: 6,
    discountPercent: 10,
    isActive: true,
  },
  {
    id: 'service-3',
    name: 'Dry Cleaning',
    description: 'Delicate fabrics and special care items',
    pricePerKg: 12,
    discountPercent: 0,
    isActive: true,
  },
  {
    id: 'service-4',
    name: 'Iron Only',
    description: 'Professional ironing service',
    pricePerKg: 3,
    discountPercent: 15,
    isActive: true,
  },
  {
    id: 'service-5',
    name: 'Express Service',
    description: 'Same day pickup and delivery',
    pricePerKg: 10,
    discountPercent: 0,
    isActive: true,
  },
];

/**
 * Custom hook for managing laundry services.
 * 
 * @returns Object containing services array, filtered active services, and CRUD methods
 */
export function useServices() {
  // Initialize state from localStorage or use defaults
  const [services, setServices] = useState<Service[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultServices;
  });

  // Persist to localStorage whenever services change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
  }, [services]);

  /**
   * Adds a new service to the catalog.
   * Generates a unique ID using timestamp.
   * 
   * @param service - Service data without ID (ID will be generated)
   */
  const addService = (service: Omit<Service, 'id'>) => {
    const newService: Service = {
      ...service,
      id: `service-${Date.now()}`,
    };
    setServices((prev) => [...prev, newService]);
  };

  /**
   * Updates an existing service.
   * 
   * @param id - ID of the service to update
   * @param updates - Partial service data to merge
   */
  const updateService = (id: string, updates: Partial<Service>) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  /**
   * Removes a service from the catalog.
   * 
   * @param id - ID of the service to remove
   */
  const removeService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  /**
   * Toggles a service's active status.
   * Inactive services are not shown to customers.
   * 
   * @param id - ID of the service to toggle
   */
  const toggleServiceActive = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  return {
    services,                                    // All services
    activeServices: services.filter((s) => s.isActive), // Only active services
    addService,
    updateService,
    removeService,
    toggleServiceActive,
  };
}
