import { NextRequest, NextResponse } from 'next/server';
import { addUser, getUser } from '../../../lib/database-functions';

export async function POST(request: NextRequest) {
  try {
    const userId = 'user-123';
    
    // Check if user already exists
    const existingUser = await getUser(userId);
    
    if (existingUser) {
      return NextResponse.json({ 
        success: true, 
        message: 'User already exists',
        user: existingUser 
      });
    }

    // Create the test user
    const newUser = await addUser({
      id: userId,
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      balance: 0
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Test user created successfully',
      user: newUser 
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ 
      error: 'Failed to create user' 
    }, { status: 500 });
  }
}
