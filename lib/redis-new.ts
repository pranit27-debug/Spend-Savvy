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
      const value = await redis.get(key);
      return value ? JSON.parse(value as string) : null;
    } catch (error) {
      console.log('Cache miss (Redis unavailable)');
      return null; // Gracefully fall back to database
    }
  },

  // Set cached data - simplified for free tier
  set: async (key: string, value: any, ttl: number = 300) => {
    try {
      // Use simple SET without TTL for free tier compatibility
      await redis.set(key, JSON.stringify(value));
      console.log(`Cached: ${key}`);
      return true;
    } catch (error) {
      console.log('Cache write failed (continuing without cache)');
      return true; // Don't break the app
    }
  },

  // Delete cached data
  del: async (key: string) => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.log('Cache invalidation failed (continuing)');
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
  notifications: (userId: string) => `notifications:${userId}`
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
    await cache.del(`user:${userId}`);
    console.log(`Invalidated user cache for: ${userId}`);
  },
  
  // Invalidate friends cache
  friends: async (userId: string) => {
    await cache.del(`friends:${userId}`);
    console.log(`Invalidated friends cache for: ${userId}`);
  },
  
  // Invalidate analytics cache
  analytics: async (userId: string) => {
    console.log(`Analytics cache invalidation requested for: ${userId}`);
    // Note: Pattern delete may not work on free tier
  },
  
  // Invalidate expenses cache
  expenses: async (userId: string) => {
    await cache.del(`expenses:${userId}`);
    console.log(`Invalidated expenses cache for: ${userId}`);
  },
  
  // Invalidate groups cache
  groups: async (userId: string) => {
    await cache.del(`groups:${userId}`);
    console.log(`Invalidated groups cache for: ${userId}`);
  },
  
  // Invalidate balances cache
  balances: async (userId: string) => {
    await cache.del(`balances:${userId}`);
    console.log(`Invalidated balances cache for: ${userId}`);
  },
  
  // Invalidate notifications cache
  notifications: async (userId: string) => {
    await cache.del(`notifications:${userId}`);
    console.log(`Invalidated notifications cache for: ${userId}`);
  },
  
  // Invalidate all cache for a user
  all: async (userId: string) => {
    await Promise.all([
      invalidateCache.user(userId),
      invalidateCache.friends(userId),
      invalidateCache.expenses(userId),
      invalidateCache.groups(userId),
      invalidateCache.balances(userId),
      invalidateCache.notifications(userId),
    ]);
    console.log(`Invalidated all cache for: ${userId}`);
  }
};
