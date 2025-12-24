import { useState, useEffect } from 'react';
import { Service } from '@/types';

const STORAGE_KEY = 'laundry-services';

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

export function useServices() {
  const [services, setServices] = useState<Service[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultServices;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
  }, [services]);

  const addService = (service: Omit<Service, 'id'>) => {
    const newService: Service = {
      ...service,
      id: `service-${Date.now()}`,
    };
    setServices((prev) => [...prev, newService]);
  };

  const updateService = (id: string, updates: Partial<Service>) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const removeService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleServiceActive = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  return {
    services,
    activeServices: services.filter((s) => s.isActive),
    addService,
    updateService,
    removeService,
    toggleServiceActive,
  };
}
