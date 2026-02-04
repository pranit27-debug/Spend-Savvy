import { Redis } from '@upstash/redis';

// Initialize Redis client for Upstash free tier
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Simple cache that gracefully handles free tier limitations
export const cache = {
  // Get cached data - always works on free tier
  get: async (key: string) => {
    try {
      console.log(`🔍 Redis GET: ${key}`);
      const value = await redis.get(key);
      if (value) {
        console.log(`✅ Redis GET SUCCESS: Found data for ${key}`);
        console.log(`🔍 Raw data type: ${typeof value}, length: ${value && typeof value === 'string' ? value.length : 'N/A'}`);
        console.log(`🔍 Raw data preview: ${value && typeof value === 'string' ? value.substring(0, 200) : JSON.stringify(value).substring(0, 200)}...`);
        
        // Check if Upstash already parsed the JSON for us
        if (typeof value === 'object' && value !== null) {
          console.log(`📋 Redis data already parsed as object for ${key}`);
          return value;
        }
        
        // If it's a string, try to parse it
        if (typeof value === 'string') {
          try {
            const parsedValue = JSON.parse(value);
            console.log(`✅ Redis JSON PARSE SUCCESS: Valid data for ${key}`);
            return parsedValue;
          } catch (parseError) {
            console.log(`❌ Redis JSON PARSE ERROR: Invalid JSON for ${key}`);
            console.log(`🔍 Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
            console.log(`🔍 Problematic data: ${value.substring(0, 500)}`);
            // Clear corrupted cache entry
            await cache.del(key);
            return null;
          }
        }
        
        // If it's neither object nor string, return as-is
        console.log(`🤔 Redis returned unexpected data type for ${key}: ${typeof value}`);
        return value;
        
      } else {
        console.log(`❌ Redis GET MISS: No data found for ${key}`);
        return null;
      }
    } catch (error) {
      console.log(`⚠️ Redis GET ERROR: ${key} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null; // Gracefully fall back to database
    }
  },

  // Set cached data - simplified for free tier
  set: async (key: string, value: any, ttl: number = 300) => {
    try {
      // Validate that we can stringify the value
      const jsonString = JSON.stringify(value);
      if (!jsonString || jsonString === 'undefined') {
        console.log(`⚠️ Redis SET ERROR: Cannot stringify value for ${key}`);
        return false;
      }
      
      // Use simple SET without TTL for free tier compatibility
      await redis.set(key, jsonString);
      console.log(`✅ Redis SET SUCCESS: Cached data for ${key} (TTL: ${ttl}s) - ${Math.round(jsonString.length / 1024)}KB`);
      return true;
    } catch (error) {
      console.log(`⚠️ Redis SET ERROR: ${key} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      return true; // Don't break the app
    }
  },

  // Delete cached data
  del: async (key: string) => {
    try {
      await redis.del(key);
      console.log(`🗑️ Redis DEL SUCCESS: Removed cache for ${key}`);
      return true;
    } catch (error) {
      console.log(`⚠️ Redis DEL ERROR: ${key} - continuing`);
      return true; // Don't break the app
    }
  },

  // Check if key exists
  exists: async (key: string) => {
    try {
      return await redis.exists(key);
    } catch (error) {
      return false;
    }
  },

  // Pattern delete - simplified for free tier
  deletePattern: async (pattern: string) => {
    try {
      // Free tier might not support KEYS command, so just log
      console.log(`Pattern delete requested: ${pattern} (may not be supported on free tier)`);
      return true;
    } catch (error) {
      return true;
    }
  }
};

// Cache keys for different data types
export const cacheKeys = {
  // User cache keys
  user: (userId: string) => `user:${userId}`,
  userSession: (token: string) => `session:${token}`,
  
  // Friends cache keys
  friends: (userId: string) => `friends:${userId}`,
  friendsSearch: (userId: string, query: string) => `friends_search:${userId}:${query.toLowerCase()}`,
  
  // Analytics cache keys
  analytics: (userId: string, type: string, timeframe: string, category?: string, subcategory?: string) => 
    `analytics:${userId}:${type}:${timeframe}:${category || 'all'}:${subcategory || 'all'}`,
  
  // Custom analytics report cache keys
  customAnalytics: (userId: string, reportType: string, filters: string) => 
    `custom_analytics:${userId}:${reportType}:${filters}`,
  
  // Analytics preferences cache keys
  analyticsPreferences: (userId: string) => `analytics_prefs:${userId}`,
  
  // AI insights cache keys
  aiInsights: (userId: string, context: string) => `ai_insights:${userId}:${context}`,
  
  // Expense cache keys
  expenses: (userId: string) => `expenses:${userId}`,
  expenseHistory: (userId: string, timeframe: string, category?: string | null, friendId?: string | null, limit?: number) => 
    `expense_history:${userId}:${timeframe}:${category || 'all'}:${friendId || 'all'}:${limit || 20}`,
  
  // Groups cache keys
  groups: (userId: string) => `groups:${userId}`,
  groupExpenses: (groupId: string) => `group_expenses:${groupId}`,
  
  // Chat/Conversation cache keys
  conversation: (userId: string) => `conversation:${userId}`,
  
  // Balance cache keys
  balances: (userId: string) => `balances:${userId}`,
  
  // OCR/Bill cache keys
  bills: (userId: string) => `bills:${userId}`,
  
  // Notifications cache keys
  notifications: (userId: string) => `notifications:${userId}`,
  
  // Dashboard cache keys
  dashboard: (userId: string) => `dashboard:${userId}`
};

// Cache TTL constants (in seconds) - Note: TTL may not work on free tier
export const cacheTTL = {
  SHORT: 180,      // 3 minutes - for search results, temporary data
  MEDIUM: 600,     // 10 minutes - for analytics, expense summaries
  LONG: 1800,      // 30 minutes - for user data, friends list
  VERY_LONG: 3600, // 1 hour - for static data, preferences
  DAY: 86400       // 24 hours - for rarely changing data
};

// Cache invalidation utilities - simplified for free tier
export const invalidateCache = {
  // Invalidate all user-related cache
  user: async (userId: string) => {
    console.log(`🗑️ [CACHE INVALIDATION] Clearing user cache for: ${userId}`);
    await cache.del(`user:${userId}`);
  },
  
  // Invalidate friends cache
  friends: async (userId: string) => {
    console.log(`🗑️ [CACHE INVALIDATION] Clearing friends cache for: ${userId}`);
    await cache.del(`friends:${userId}`);
  },
  
  // Invalidate analytics cache
  analytics: async (userId: string) => {
    console.log(`🗑️ [CACHE INVALIDATION] Analytics cache invalidation requested for: ${userId}`);
    // Clear standard analytics cache
    await cache.del(`analytics:${userId}:total_spent:this_month:all:all`);
    await cache.del(`analytics:${userId}:category_breakdown:this_month:all:all`);
    await cache.del(`analytics:${userId}:friend_expenses:this_month:all:all`);
    await cache.del(`analytics:${userId}:monthly_comparison:this_month:all:all`);
    
    // Clear custom analytics and preferences
    await cache.del(`analytics_prefs:${userId}`);
    console.log(`✅ [CACHE INVALIDATION] Analytics cache cleared for: ${userId}`);
  },
  
  // Invalidate custom analytics cache
  customAnalytics: async (userId: string) => {
    console.log(`🗑️ [CACHE INVALIDATION] Custom analytics cache invalidation for: ${userId}`);
    // Note: Pattern delete may not work on free tier, but we log the attempt
    await cache.deletePattern(`custom_analytics:${userId}:*`);
  },
  
  // Invalidate AI insights cache
  aiInsights: async (userId: string) => {
    console.log(`🗑️ [CACHE INVALIDATION] AI insights cache invalidation for: ${userId}`);
    await cache.deletePattern(`ai_insights:${userId}:*`);
  },
  
  // Invalidate expenses cache
  expenses: async (userId: string) => {
    console.log(`🗑️ [CACHE INVALIDATION] Clearing expenses cache for: ${userId}`);
    await cache.del(`expenses:${userId}`);
  },
  
  // Invalidate groups cache
  groups: async (userId: string) => {
    console.log(`🗑️ [CACHE INVALIDATION] Clearing groups cache for: ${userId}`);
    await cache.del(`groups:${userId}`);
  },
  
  // Invalidate balances cache
  balances: async (userId: string) => {
    console.log(`🗑️ [CACHE INVALIDATION] Clearing balances cache for: ${userId}`);
    await cache.del(`balances:${userId}`);
  },
  
  // Invalidate notifications cache
  notifications: async (userId: string) => {
    console.log(`🗑️ [CACHE INVALIDATION] Clearing notifications cache for: ${userId}`);
    await cache.del(`notifications:${userId}`);
  },
  
  // Invalidate dashboard cache
  dashboard: async (userId: string) => {
    console.log(`🗑️ [CACHE INVALIDATION] Clearing dashboard cache for: ${userId}`);
    await cache.del(`dashboard:${userId}`);
  },
  
  // Invalidate all cache for a user
  all: async (userId: string) => {
    console.log(`🗑️ [CACHE INVALIDATION] Clearing ALL cache for user: ${userId}`);
    await Promise.all([
      invalidateCache.user(userId),
      invalidateCache.friends(userId),
      invalidateCache.expenses(userId),
      invalidateCache.groups(userId),
      invalidateCache.balances(userId),
      invalidateCache.notifications(userId),
      invalidateCache.dashboard(userId),
      invalidateCache.analytics(userId),
      invalidateCache.customAnalytics(userId),
      invalidateCache.aiInsights(userId),
    ]);
    console.log(`✅ [CACHE INVALIDATION] All cache cleared for user: ${userId}`);
  }
};
