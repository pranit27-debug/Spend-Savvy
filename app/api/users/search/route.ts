import { NextRequest, NextResponse } from 'next/server';
import { searchAllUsers } from '../../../../lib/database-functions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get('term');

    if (!term || term.length < 2) {
      return NextResponse.json([]);
    }

    const results = await searchAllUsers(term);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
