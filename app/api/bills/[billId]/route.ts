import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;

    if (!billId) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    const db = await connectToPostgres();

    // Delete the bill (this will also delete associated bill_items due to CASCADE)
    const result = await db.query(`
      DELETE FROM bills 
      WHERE id = $1
      RETURNING id
    `, [billId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bill deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting bill:', error);
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    );
  }
}
