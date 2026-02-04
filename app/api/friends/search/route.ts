import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../../lib/db';
import { cache, cacheKeys, cacheTTL } from '../../../../lib/redis';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const query = url.searchParams.get('query');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = query 
      ? cacheKeys.friendsSearch(userId, query)
      : cacheKeys.friends(userId);

    // Try to get from cache first
    const cachedFriends = await cache.get(cacheKey);
    if (cachedFriends) {
      console.log('Cache hit for friends search:', cacheKey);
      return NextResponse.json({
        success: true,
        friends: cachedFriends,
        cached: true
      });
    }

    console.log('Cache miss for friends search:', cacheKey);

    const db = await connectToPostgres();

    let friendsQuery = `
      SELECT u.id, u.name, u.email, u.phone 
      FROM users u 
      INNER JOIN friends f ON u.id = f.friend_id 
      WHERE f.user_id = $1
    `;
    let queryParams = [userId];

    // If there's a search query, filter by name, email, or phone
    if (query && query.trim()) {
      friendsQuery += ` AND (
        LOWER(u.name) LIKE LOWER($2) OR 
        LOWER(u.email) LIKE LOWER($2) OR 
        u.phone LIKE $2
      )`;
      queryParams.push(`%${query.trim()}%`);
    }

    friendsQuery += ` ORDER BY u.name LIMIT 10`;

    const result = await db.query(friendsQuery, queryParams);

    const friends = result.rows.map(friend => ({
      id: friend.id,
      name: friend.name,
      email: friend.email,
      phone: friend.phone || '',
      displayText: `${friend.name} (${friend.email}${friend.phone ? ', ' + friend.phone : ''})`
    }));

    // Cache the results
    const ttl = query ? cacheTTL.SHORT : cacheTTL.MEDIUM; // Search results expire faster
    await cache.set(cacheKey, friends, ttl);
    console.log('Cached friends search result:', cacheKey);

    return NextResponse.json({
      success: true,
      friends,
      cached: false
    });

  } catch (error) {
    console.error('Error searching friends:', error);
    return NextResponse.json(
      { error: 'Failed to search friends' },
      { status: 500 }
    );
  }
}
