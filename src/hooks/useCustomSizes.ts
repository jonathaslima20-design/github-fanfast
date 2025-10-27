import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CustomSize {
  id: string;
  size_name: string;
  size_type: 'apparel' | 'shoe' | 'custom';
  created_at: string;
}

interface UseCustomSizesReturn {
  customSizes: string[];
  loading: boolean;
  addCustomSize: (sizeName: string, sizeType?: 'apparel' | 'shoe' | 'custom') => Promise<boolean>;
  removeCustomSize: (sizeName: string) => Promise<boolean>;
  refreshCustomSizes: () => Promise<void>;
}

export function useCustomSizes(userId?: string): UseCustomSizesReturn {
  const [customSizes, setCustomSizes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomSizes = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_custom_sizes')
        .select('size_name')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const sizes = data?.map(item => item.size_name) || [];
      setCustomSizes(sizes);
    } catch (error) {
      console.error('Error loading custom sizes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCustomSize = async (sizeName: string, sizeType: 'apparel' | 'shoe' | 'custom' = 'custom'): Promise<boolean> => {
    if (!userId || !sizeName.trim()) return false;

    try {
      const trimmedSize = sizeName.trim();

      // Check if size already exists
      if (customSizes.includes(trimmedSize)) {
        return true; // Already exists, consider it successful
      }

      const { error } = await supabase
        .from('user_custom_sizes')
        .insert({
          user_id: userId,
          size_name: trimmedSize,
          size_type: sizeType,
        });

      if (error) {
        // If it's a duplicate error, just ignore it
        if (error.code === '23505') {
          return true;
        }
        throw error;
      }

      // Update local state
      setCustomSizes(prev => [...prev, trimmedSize]);
      return true;
    } catch (error) {
      console.error('Error adding custom size:', error);
      return false;
    }
  };

  const removeCustomSize = async (sizeName: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('user_custom_sizes')
        .delete()
        .eq('user_id', userId)
        .eq('size_name', sizeName);

      if (error) throw error;

      // Update local state
      setCustomSizes(prev => prev.filter(size => size !== sizeName));
      return true;
    } catch (error) {
      console.error('Error removing custom size:', error);
      return false;
    }
  };

  const refreshCustomSizes = async () => {
    await loadCustomSizes();
  };

  useEffect(() => {
    loadCustomSizes();
  }, [userId]);

  return {
    customSizes,
    loading,
    addCustomSize,
    removeCustomSize,
    refreshCustomSizes,
  };
}