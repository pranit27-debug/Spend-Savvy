import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '@/lib/db';
import { cache, cacheKeys, cacheTTL } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`🔍 [BILLS] Checking cache for key: ${cacheKeys.bills(userId)}`);
    
    // Try to get from cache first
    const cachedBills = await cache.get(cacheKeys.bills(userId));
    
    if (cachedBills) {
      console.log(`✅ [BILLS] CACHE HIT! Returning cached bills data`);
      console.log(`📄 [BILLS] Cached: ${cachedBills.bills.length} bills for user`);
      return NextResponse.json(cachedBills);
    }

    console.log(`❌ [BILLS] CACHE MISS! Fetching bills data from database...`);

    const db = await connectToPostgres();

    // Fetch all bills for the user
    const result = await db.query(`
      SELECT 
        id,
        filename,
        merchant_name,
        total_amount,
        bill_date,
        raw_ocr_text,
        parsed_data,
        created_at,
        updated_at,
        user_id
      FROM bills 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    const bills = result.rows;

    const responseData = {
      success: true,
      bills: bills.map((bill: any) => ({
        id: bill.id,
        filename: bill.filename,
        merchantName: bill.merchant_name,
        totalAmount: parseFloat(bill.total_amount) || 0,
        billDate: bill.bill_date,
        rawOcrText: bill.raw_ocr_text,
        parsedData: bill.parsed_data || null,
        createdAt: bill.created_at,
        updatedAt: bill.updated_at,
        userId: bill.user_id
      }))
    };

    // Cache the bills data
    console.log(`💾 [BILLS] Storing bills data in Redis cache...`);
    const cacheSuccess = await cache.set(cacheKeys.bills(userId), responseData, cacheTTL.MEDIUM);
    
    if (cacheSuccess) {
      console.log(`✅ [BILLS] Bills data successfully cached in Redis`);
      console.log(`📄 [BILLS] Cached: ${bills.length} bills for user`);
    } else {
      console.log(`⚠️ [BILLS] Failed to cache bills data, but continuing...`);
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching user bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}
