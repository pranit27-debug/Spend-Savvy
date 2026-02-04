import { NextRequest, NextResponse } from 'next/server';
import { listFriends } from '../../../lib/database-functions';
import { cache, cacheKeys, cacheTTL } from '../../../lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`🔍 [FRIENDS] Checking cache for key: ${cacheKeys.friends(userId)}`);
    // Try to get from cache first
    const cachedFriends = await cache.get(cacheKeys.friends(userId));

    // Always fetch from DB to check for changes
    const friendsData = await listFriends(userId);
    const friends = friendsData.map(friend => ({
      id: friend.friend_id,
      name: friend.name,
      email: friend.email,
      phone: friend.phone
    }));
    const responseData = {
      success: true,
      friends: friends
    };

    let shouldUpdateCache = false;
    if (!cachedFriends) {
      shouldUpdateCache = true;
      console.log('No cache found, will set cache.');
    } else {
      // Compare DB and cache
      const cachedList = JSON.stringify(cachedFriends.friends);
      const dbList = JSON.stringify(friends);
      if (cachedList !== dbList) {
        shouldUpdateCache = true;
        console.log('DB and cache differ, will update cache.');
      }
    }

    if (shouldUpdateCache) {
      await cache.set(cacheKeys.friends(userId), responseData, cacheTTL.LONG);
      console.log('Cache updated with latest friends data.');
      return NextResponse.json(responseData);
    } else {
      console.log('Cache is up to date, returning cached data.');
      return NextResponse.json(cachedFriends);
    }
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch friends'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friend } = body;
    if (!userId || !friend) {
      return NextResponse.json({ error: 'userId and friend are required' }, { status: 400 });
    }
    // Add friend to DB
    const { addFriend } = await import('../../../lib/database-functions');
    const result = await addFriend(userId, friend);
    // Invalidate cache
    await cache.del(cacheKeys.friends(userId));
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error adding friend:', error);
    return NextResponse.json({ success: false, error: 'Failed to add friend' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friendId } = body;
    if (!userId || !friendId) {
      return NextResponse.json({ error: 'userId and friendId are required' }, { status: 400 });
    }
    // Delete friend from DB (bidirectional)
    const { deleteFriend } = await import('../../../lib/database-functions');
    const result1 = await deleteFriend(userId, friendId);
    const result2 = await deleteFriend(friendId, userId);
    
    // Invalidate cache for both users
    await cache.del(cacheKeys.friends(userId));
    await cache.del(cacheKeys.friends(friendId));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Friend relationship removed successfully',
      result: { removed: result1 || result2 } 
    });
  } catch (error) {
    console.error('Error deleting friend:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete friend' }, { status: 500 });
  }
}
