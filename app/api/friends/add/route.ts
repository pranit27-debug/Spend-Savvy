import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, getUserByPhone, addFriend, checkFriendshipExists } from '../../../../lib/database-functions';
import { cache, cacheKeys } from '../../../../lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, phone } = await request.json();

    if (!userId || (!email && !phone)) {
      return NextResponse.json({ 
        error: 'User ID and either email or phone are required' 
      }, { status: 400 });
    }

    // First, check if user exists by email
    let existingUser = null;
    if (email) {
      existingUser = await getUserByEmail(email);
    }
    
    // If not found by email, check by phone
    if (!existingUser && phone) {
      existingUser = await getUserByPhone(phone);
    }

    // User must exist in the system to be added as friend
    if (!existingUser) {
      return NextResponse.json({ 
        error: 'User not found. They need to sign up first before you can add them as a friend.' 
      }, { status: 404 });
    }

    // Check if trying to add themselves
    if (existingUser.id === userId) {
      return NextResponse.json({ 
        error: 'You cannot add yourself as a friend.' 
      }, { status: 400 });
    }

    // Check if friendship already exists
    const friendshipExists = await checkFriendshipExists(userId, existingUser.id);
    if (friendshipExists) {
      return NextResponse.json({ 
        error: `${existingUser.name} is already in your friends list.` 
      }, { status: 400 });
    }

    // Add friend relationship (bidirectional)
    await addFriend(userId, existingUser.id);
    await addFriend(existingUser.id, userId);
    
    // Invalidate cache for both users
    await cache.del(cacheKeys.friends(userId));
    await cache.del(cacheKeys.friends(existingUser.id));
    
    // Remove password from response for security
    const { password, ...friendData } = existingUser;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Friend added successfully',
      friend: friendData 
    });

  } catch (error) {
    console.error('Error adding friend:', error);
    
    // Provide more specific error message based on the error
    let errorMessage = 'Failed to add friend. Please try again.';
    
    // Check if it's a database constraint error (duplicate entry)
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === '23505') { // PostgreSQL unique violation
        errorMessage = 'This person is already in your friends list.';
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 500 });
  }
}
