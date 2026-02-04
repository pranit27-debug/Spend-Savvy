'use client';

import { useCallback, useEffect, useState } from 'react';

interface AnalyticsParams {
  userId: string;
  type: string;
  timeframe?: string;
  category?: string;
  subcategory?: string;
  friendId?: string;
}

interface CustomReportParams {
  userId: string;
  reportType: 'spending_insights' | 'friend_analysis' | 'category_deep_dive' | 'temporal_analysis';
  filters: any;
  preferences?: any;
  generateAI?: boolean;
}

interface AnalyticsPreferences {
  defaultTimeframe: string;
  preferredChartType: string;
  enableNotifications: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

interface UseAnalyticsResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
  refetch: () => Promise<void>;
  clearCache: () => Promise<void>;
  updatePreferences: (preferences: AnalyticsPreferences) => Promise<void>;
}

// Hook for standard analytics data with caching
export function useAnalytics<T = any>(params: AnalyticsParams): UseAnalyticsResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const fetchData = useCallback(async () => {
    if (!params.userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        userId: params.userId,
        type: params.type,
        timeframe: params.timeframe || 'this_month',
        ...(params.category && { category: params.category }),
        ...(params.subcategory && { subcategory: params.subcategory }),
        ...(params.friendId && { friendId: params.friendId }),
      });

      console.log('🔍 [useAnalytics] Fetching analytics data:', params);

      const response = await fetch(`/api/analytics?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setIsCached(result.cached || false);
        console.log('✅ [useAnalytics] Data fetched successfully, cached:', result.cached);
      } else {
        throw new Error(result.error || 'Failed to fetch analytics data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ [useAnalytics] Error fetching data:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [params.userId, params.type, params.timeframe, params.category, params.subcategory, params.friendId]);

  const clearCache = useCallback(async () => {
    try {
      console.log('🗑️ [useAnalytics] Clearing analytics cache');
      
      const response = await fetch('/api/analytics', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: params.userId,
          action: 'clear_cache',
          clearCache: {
            includeCustom: true,
            includeAI: true,
          },
        }),
      });

      if (response.ok) {
        console.log('✅ [useAnalytics] Cache cleared successfully');
        // Refetch data after clearing cache
        await fetchData();
      }
    } catch (err) {
      console.error('❌ [useAnalytics] Error clearing cache:', err);
    }
  }, [params.userId, fetchData]);

  const updatePreferences = useCallback(async (preferences: AnalyticsPreferences) => {
    try {
      console.log('⚙️ [useAnalytics] Updating preferences:', preferences);
      
      const response = await fetch('/api/analytics', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: params.userId,
          action: 'update_preferences',
          preferences,
        }),
      });

      if (response.ok) {
        console.log('✅ [useAnalytics] Preferences updated successfully');
      }
    } catch (err) {
      console.error('❌ [useAnalytics] Error updating preferences:', err);
    }
  }, [params.userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    isCached,
    refetch: fetchData,
    clearCache,
    updatePreferences,
  };
}

// Hook for custom analytics reports with caching
export function useCustomAnalytics<T = any>(params: CustomReportParams): UseAnalyticsResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📊 [useCustomAnalytics] Generating custom report:', params);

      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Custom analytics API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setIsCached(result.cached || false);
        console.log('✅ [useCustomAnalytics] Report generated successfully, cached:', result.cached);
      } else {
        throw new Error(result.error || 'Failed to generate custom analytics report');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ [useCustomAnalytics] Error generating report:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  const clearCache = useCallback(async () => {
    try {
      console.log('🗑️ [useCustomAnalytics] Clearing custom analytics cache');
      
      const response = await fetch('/api/analytics', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: params.userId,
          action: 'clear_cache',
          clearCache: {
            includeCustom: true,
            includeAI: params.generateAI,
          },
        }),
      });

      if (response.ok) {
        console.log('✅ [useCustomAnalytics] Cache cleared successfully');
      }
    } catch (err) {
      console.error('❌ [useCustomAnalytics] Error clearing cache:', err);
    }
  }, [params.userId, params.generateAI]);

  const updatePreferences = useCallback(async (preferences: AnalyticsPreferences) => {
    try {
      console.log('⚙️ [useCustomAnalytics] Updating preferences:', preferences);
      
      const response = await fetch('/api/analytics', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: params.userId,
          action: 'update_preferences',
          preferences,
        }),
      });

      if (response.ok) {
        console.log('✅ [useCustomAnalytics] Preferences updated successfully');
      }
    } catch (err) {
      console.error('❌ [useCustomAnalytics] Error updating preferences:', err);
    }
  }, [params.userId]);

  return {
    data,
    isLoading,
    error,
    isCached,
    refetch: generateReport,
    clearCache,
    updatePreferences,
  };
}

// Hook for analytics cache management
export function useAnalyticsCache(userId: string) {
  const [isClearing, setIsClearing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const clearAllCache = useCallback(async () => {
    setIsClearing(true);
    try {
      console.log('🗑️ [useAnalyticsCache] Clearing all analytics cache');
      
      const response = await fetch('/api/analytics', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'clear_cache',
          clearCache: {
            includeCustom: true,
            includeAI: true,
          },
        }),
      });

      if (response.ok) {
        console.log('✅ [useAnalyticsCache] All cache cleared successfully');
        return true;
      }
    } catch (err) {
      console.error('❌ [useAnalyticsCache] Error clearing cache:', err);
    } finally {
      setIsClearing(false);
    }
    return false;
  }, [userId]);

  const refreshCache = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 [useAnalyticsCache] Refreshing analytics cache');
      
      const response = await fetch('/api/analytics', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'refresh_cache',
        }),
      });

      if (response.ok) {
        console.log('✅ [useAnalyticsCache] Cache refreshed successfully');
        return true;
      }
    } catch (err) {
      console.error('❌ [useAnalyticsCache] Error refreshing cache:', err);
    } finally {
      setIsRefreshing(false);
    }
    return false;
  }, [userId]);

  return {
    clearAllCache,
    refreshCache,
    isClearing,
    isRefreshing,
  };
}

export type { AnalyticsParams, AnalyticsPreferences, CustomReportParams };

