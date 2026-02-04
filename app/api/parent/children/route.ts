import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getChildrenForParent, addChildByEmailAndPhone } from '../../../../lib/database-functions';

// Get all children for a parent
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const children = await getChildrenForParent(decoded.userId);
    
    return NextResponse.json({ 
      success: true, 
      children 
    });
    
  } catch (error) {
    console.error('Error fetching children:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch children' 
    }, { status: 500 });
  }
}

// Add a child by email and phone
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const { childEmail, childPhone, thresholdAmount } = await request.json();
    
    if (!childEmail || !childPhone) {
      return NextResponse.json({ 
        error: 'Child email and phone number are required' 
      }, { status: 400 });
    }
    
    const result = await addChildByEmailAndPhone(
      decoded.userId, 
      childEmail, 
      childPhone, 
      thresholdAmount || 0
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'Child added successfully',
      relationship: result.relationship,
      child: result.child
    });
    
  } catch (error: any) {
    console.error('Error adding child:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to add child' 
    }, { status: 500 });
  }
}
