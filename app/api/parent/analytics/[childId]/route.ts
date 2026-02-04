import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../../lib/auth';
import { getChildTotalSpending, getChildSpendingAnalytics, getChildSpendingByCategory } from '../../../../../lib/database-functions';

// Get child spending analytics
export async function GET(request: NextRequest, { params }: { params: Promise<{ childId: string }> }) {
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
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const { childId } = await params;
    
    // Get total spending
    const totalSpending = await getChildTotalSpending(childId, startDate || undefined, endDate || undefined);
    
    // Get detailed spending analytics
    const spendingDetails = await getChildSpendingAnalytics(childId, startDate || undefined, endDate || undefined);
    
    // Get spending by category
    const spendingByCategory = await getChildSpendingByCategory(childId, startDate || undefined, endDate || undefined);
    
    return NextResponse.json({ 
      success: true, 
      analytics: {
        totalSpending,
        spendingDetails,
        spendingByCategory
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching child analytics:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch child analytics' 
    }, { status: 500 });
  }
}
