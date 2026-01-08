/**
 * useSettings.ts - Settings Management Hook
 * 
 * This hook manages application settings stored in the database.
 * Admins can update settings, while all users can read them.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Settings {
  service_fee: number;
  transport_fee: number;
}

const DEFAULT_SETTINGS: Settings = {
  service_fee: 5,
  transport_fee: 10,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) throw error;

      if (data) {
        const settingsMap: Partial<Settings> = {};
        data.forEach((item: { key: string; value: unknown }) => {
          if (item.key === 'service_fee') {
            settingsMap.service_fee = Number(item.value);
          } else if (item.key === 'transport_fee') {
            settingsMap.transport_fee = Number(item.value);
          }
        });
        setSettings({ ...DEFAULT_SETTINGS, ...settingsMap });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: keyof Settings, value: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('settings')
        .update({ value: value })
        .eq('key', key);

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
      toast({
        title: 'Setting updated',
        description: `${key.replace('_', ' ')} has been updated to €${value}`,
      });
      return true;
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update setting. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    settings,
    isLoading,
    updateSetting,
    refetch: fetchSettings,
  };
}
