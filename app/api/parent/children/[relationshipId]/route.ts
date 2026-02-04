import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../../lib/auth';
import { updateChildThreshold } from '../../../../../lib/database-functions';

// Update child spending threshold
export async function PUT(request: NextRequest, { params }: { params: Promise<{ relationshipId: string }> }) {
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
    
    const { thresholdAmount } = await request.json();
    
    if (thresholdAmount === undefined || thresholdAmount < 0) {
      return NextResponse.json({ 
        error: 'Valid threshold amount is required' 
      }, { status: 400 });
    }
    
    const { relationshipId } = await params;
    const updatedRelationship = await updateChildThreshold(relationshipId, thresholdAmount);
    
    if (!updatedRelationship) {
      return NextResponse.json({ 
        error: 'Relationship not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Threshold updated successfully',
      relationship: updatedRelationship
    });
    
  } catch (error: any) {
    console.error('Error updating threshold:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to update threshold' 
    }, { status: 500 });
  }
}
