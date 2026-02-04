import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateToken, hashPassword, validateEmail, validatePassword, validatePhone } from '../../../../lib/auth';
import { addUser, getUserByEmail, getUserByPhone } from '../../../../lib/database-functions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Signup request body:', body);
    
    const { name, email, phone, password, confirmPassword, role } = body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      console.log('Missing required fields:', { name: !!name, email: !!email, password: !!password, confirmPassword: !!confirmPassword });
      return NextResponse.json({ 
        error: 'Name, email, password, and confirm password are required' 
      }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ 
        error: 'Passwords do not match' 
      }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ 
        error: 'Please enter a valid email address' 
      }, { status: 400 });
    }

    if (phone && !validatePhone(phone)) {
      return NextResponse.json({ 
        error: 'Please enter a valid phone number' 
      }, { status: 400 });
    }

    // Validate role
    if (role && !['user', 'parent'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be either "user" or "parent"' 
      }, { status: 400 });
    }

    const passwordValidation = validatePassword(password);
    console.log('Password validation result:', passwordValidation);
    if (!passwordValidation.isValid) {
      return NextResponse.json({ 
        error: passwordValidation.message 
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUserByEmail = await getUserByEmail(email);
    if (existingUserByEmail) {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 409 });
    }

    if (phone) {
      const existingUserByPhone = await getUserByPhone(phone);
      if (existingUserByPhone) {
        return NextResponse.json({ 
          error: 'User with this phone number already exists' 
        }, { status: 409 });
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    const newUser = await addUser({
      id: userId,
      name,
      email,
      phone: phone || null,
      password: hashedPassword,
      balance: 0,
      role: role || 'user'
    });

    // Generate JWT token
    const token = generateToken(userId, email);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({ 
      success: true,
      message: 'User created successfully',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ 
      error: 'Failed to create user. Please try again.' 
    }, { status: 500 });
  }
}
