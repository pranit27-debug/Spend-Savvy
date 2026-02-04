// Redis-based caching for embeddings and AI responses
import Redis from 'ioredis';

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
}

// Cache keys
const CACHE_KEYS = {
  embedding: (text: string) => `embedding:${Buffer.from(text).toString('base64')}`,
  category: (description: string) => `category:${Buffer.from(description).toString('base64')}`,
  aiResponse: (prompt: string) => `ai:${Buffer.from(prompt).toString('base64')}`
};

// Cache TTL (Time To Live)
const CACHE_TTL = {
  embedding: 30 * 24 * 60 * 60, // 30 days
  category: 7 * 24 * 60 * 60,   // 7 days
  aiResponse: 24 * 60 * 60      // 1 day
};

export class CacheManager {
  static async getEmbedding(text: string): Promise<number[] | null> {
    if (!redis) return null;
    
    try {
      const cached = await redis.get(CACHE_KEYS.embedding(text));
      if (cached) {
        console.log(`📋 [CACHE] Embedding cache hit for: "${text.substring(0, 30)}..."`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('❌ [CACHE] Error reading embedding cache:', error);
    }
    
    return null;
  }
  
  static async setEmbedding(text: string, embedding: number[]): Promise<void> {
    if (!redis) return;
    
    try {
      await redis.setex(
        CACHE_KEYS.embedding(text),
        CACHE_TTL.embedding,
        JSON.stringify(embedding)
      );
      console.log(`💾 [CACHE] Cached embedding for: "${text.substring(0, 30)}..."`);
    } catch (error) {
      console.error('❌ [CACHE] Error saving embedding cache:', error);
    }
  }
  
  static async getCategory(description: string): Promise<{
    category: string;
    confidence: number;
    method: string;
  } | null> {
    if (!redis) return null;
    
    try {
      const cached = await redis.get(CACHE_KEYS.category(description));
      if (cached) {
        console.log(`📋 [CACHE] Category cache hit for: "${description}"`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('❌ [CACHE] Error reading category cache:', error);
    }
    
    return null;
  }
  
  static async setCategory(
    description: string, 
    result: { category: string; confidence: number; method: string }
  ): Promise<void> {
    if (!redis) return;
    
    try {
      await redis.setex(
        CACHE_KEYS.category(description),
        CACHE_TTL.category,
        JSON.stringify(result)
      );
      console.log(`💾 [CACHE] Cached category for: "${description}"`);
    } catch (error) {
      console.error('❌ [CACHE] Error saving category cache:', error);
    }
  }
  
  static async getAIResponse(prompt: string): Promise<string | null> {
    if (!redis) return null;
    
    try {
      const cached = await redis.get(CACHE_KEYS.aiResponse(prompt));
      if (cached) {
        console.log(`📋 [CACHE] AI response cache hit`);
        return cached;
      }
    } catch (error) {
      console.error('❌ [CACHE] Error reading AI response cache:', error);
    }
    
    return null;
  }
  
  static async setAIResponse(prompt: string, response: string): Promise<void> {
    if (!redis) return;
    
    try {
      await redis.setex(
        CACHE_KEYS.aiResponse(prompt),
        CACHE_TTL.aiResponse,
        response
      );
      console.log(`💾 [CACHE] Cached AI response`);
    } catch (error) {
      console.error('❌ [CACHE] Error saving AI response cache:', error);
    }
  }
  
  // Batch operations for better performance
  static async batchGetCategories(descriptions: string[]): Promise<Map<string, any>> {
    if (!redis) return new Map();
    
    const results = new Map();
    const keys = descriptions.map(desc => CACHE_KEYS.category(desc));
    
    try {
      const cached = await redis.mget(keys);
      descriptions.forEach((desc, index) => {
        if (cached[index]) {
          results.set(desc, JSON.parse(cached[index]));
        }
      });
      
      console.log(`📋 [CACHE] Batch category cache: ${results.size}/${descriptions.length} hits`);
    } catch (error) {
      console.error('❌ [CACHE] Error in batch category read:', error);
    }
    
    return results;
  }
  
  // Cache statistics
  static async getCacheStats(): Promise<{
    embeddingCount: number;
    categoryCount: number;
    aiResponseCount: number;
  }> {
    if (!redis) return { embeddingCount: 0, categoryCount: 0, aiResponseCount: 0 };
    
    try {
      const [embeddingKeys, categoryKeys, aiKeys] = await Promise.all([
        redis.keys('embedding:*'),
        redis.keys('category:*'),
        redis.keys('ai:*')
      ]);
      
      return {
        embeddingCount: embeddingKeys.length,
        categoryCount: categoryKeys.length,
        aiResponseCount: aiKeys.length
      };
    } catch (error) {
      console.error('❌ [CACHE] Error getting cache stats:', error);
      return { embeddingCount: 0, categoryCount: 0, aiResponseCount: 0 };
    }
  }
  
  // Clear cache for testing/debugging
  static async clearCache(): Promise<void> {
    if (!redis) return;
    
    try {
      const keys = await redis.keys('embedding:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      
      const categoryKeys = await redis.keys('category:*');
      if (categoryKeys.length > 0) {
        await redis.del(...categoryKeys);
      }
      
      console.log(`🧹 [CACHE] Cleared ${keys.length + categoryKeys.length} cache entries`);
    } catch (error) {
      console.error('❌ [CACHE] Error clearing cache:', error);
    }
  }
}

export default CacheManager;
