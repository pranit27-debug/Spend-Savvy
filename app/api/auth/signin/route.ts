import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '../../../../lib/database-functions';
import { comparePassword, generateToken, validateEmail } from '../../../../lib/auth';
import { cache, cacheKeys, cacheTTL } from '../../../../lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ 
        error: 'Please enter a valid email address' 
      }, { status: 400 });
    }

    // Try to get user from cache first
    const userCacheKey = `user_email:${email}`;
    let user: any = await cache.get(userCacheKey);
    
    if (!user) {
      // Get user from database
      user = await getUserByEmail(email);
      if (user) {
        // Cache user data for 30 minutes
        await cache.set(userCacheKey, user, cacheTTL.LONG);
      }
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid email or password' 
      }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Invalid email or password' 
      }, { status: 401 });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Cache user session
    const sessionCacheKey = cacheKeys.userSession(token);
    await cache.set(sessionCacheKey, { userId: user.id, email: user.email }, cacheTTL.VERY_LONG);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ 
      success: true,
      message: 'Sign in successful',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Error signing in user:', error);
    return NextResponse.json({ 
      error: 'Failed to sign in. Please try again.' 
    }, { status: 500 });
  }
}
