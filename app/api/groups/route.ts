import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../lib/db';
import { cache, cacheKeys, cacheTTL, invalidateCache } from '../../../lib/redis';

export async function GET(request: NextRequest) {
  let userId: string | null = null;
  
  try {
    const { searchParams } = new URL(request.url);
    userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Try to get from cache first
    const groupsCacheKey = cacheKeys.groups(userId);
    console.log(`🔍 [GROUPS] Checking cache for key: ${groupsCacheKey}`);
    
    const cachedGroups = await cache.get(groupsCacheKey);
    if (cachedGroups) {
      console.log('✅ [GROUPS] CACHE HIT! Returning groups data from Redis cache');
      console.log(`👥 [GROUPS] Cached: ${cachedGroups.groups?.length || 0} groups found`);
      return NextResponse.json(cachedGroups);
    }

    console.log('❌ [GROUPS] CACHE MISS! Fetching groups data from database...');

    const db = await connectToPostgres();
    
    // Get all groups where the user is a member
    const query = `
      WITH user_groups AS (
        SELECT DISTINCT group_id
        FROM group_members
        WHERE user_id = $1
      ),
      group_stats AS (
        SELECT 
          g.id,
          COUNT(DISTINCT e.id) as expense_count,
          COALESCE(SUM(e.amount), 0) as total_expenses
        FROM groups g
        LEFT JOIN expenses e ON g.id = e.group_id
        WHERE g.id IN (SELECT group_id FROM user_groups)
        GROUP BY g.id
      )
      SELECT 
        g.id,
        g.name,
        g.created_by,
        g.created_at,
        u.name as created_by_name,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'user_id', gm.user_id,
            'user_name', um.name,
            'user_email', um.email,
            'joined_at', gm.joined_at
          )
        ) as members,
        COUNT(gm.user_id) as member_count,
        COALESCE(gs.expense_count, 0) as expense_count,
        COALESCE(gs.total_expenses, 0) as total_expenses
      FROM groups g
      INNER JOIN user_groups ug ON g.id = ug.group_id
      INNER JOIN group_members gm ON g.id = gm.group_id
      INNER JOIN users u ON g.created_by = u.id
      INNER JOIN users um ON gm.user_id = um.id
      LEFT JOIN group_stats gs ON g.id = gs.id
      GROUP BY g.id, g.name, g.created_by, g.created_at, u.name, gs.expense_count, gs.total_expenses
      ORDER BY g.created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    
    const groups = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      created_by: row.created_by,
      created_by_name: row.created_by_name,
      created_at: row.created_at,
      members: row.members || [],
      memberCount: parseInt(row.member_count) || 0,
      totalExpenses: parseFloat(row.total_expenses) || 0,
      expense_count: parseInt(row.expense_count) || 0
    }));

    console.log('Groups with member counts:', groups.map(g => ({ 
      name: g.name, 
      memberCount: g.memberCount, 
      actualMembers: g.members.length,
      members: g.members 
    })));

    const response = {
      success: true,
      groups,
      count: groups.length
    };

    // Cache the result for 10 minutes
    console.log('💾 [GROUPS] Storing groups data in Redis cache...');
    await cache.set(groupsCacheKey, response, cacheTTL.MEDIUM);
    console.log('✅ [GROUPS] Groups data successfully cached in Redis');
    console.log(`👥 [GROUPS] Cached: ${groups.length} groups for user`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching groups:', error);
    console.error('Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: userId
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, createdBy, memberIds } = await request.json();

    if (!name || !createdBy || !memberIds || !Array.isArray(memberIds)) {
      return NextResponse.json(
        { error: 'Name, createdBy, and memberIds are required' },
        { status: 400 }
      );
    }

    const db = await connectToPostgres();
    
    // Generate a unique group ID
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Start transaction
    await db.query('BEGIN');
    
    try {
      // Create the group
      await db.query(
        'INSERT INTO groups (id, name, created_by) VALUES ($1, $2, $3)',
        [groupId, name, createdBy]
      );
      
      // Add all members to the group
      for (const memberId of memberIds) {
        await db.query(
          'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
          [groupId, memberId]
        );
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      // Fetch the created group with all details
      const query = `
        SELECT 
          g.id,
          g.name,
          g.created_by,
          g.created_at,
          u.name as created_by_name,
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'user_id', gm.user_id,
              'user_name', um.name,
              'user_email', um.email,
              'joined_at', gm.joined_at
            ) ORDER BY gm.joined_at
          ) as members,
          COUNT(DISTINCT gm.user_id) as member_count
        FROM groups g
        INNER JOIN users u ON g.created_by = u.id
        INNER JOIN group_members gm ON g.id = gm.group_id
        INNER JOIN users um ON gm.user_id = um.id
        WHERE g.id = $1
        GROUP BY g.id, g.name, g.created_by, g.created_at, u.name
      `;
      
      const result = await db.query(query, [groupId]);
      
      if (result.rows.length === 0) {
        throw new Error('Failed to fetch created group');
      }
      
      const group = result.rows[0];
      
      // Invalidate groups cache for all members
      for (const memberId of memberIds) {
        await invalidateCache.groups(memberId);
      }
      
      return NextResponse.json({
        success: true,
        group: {
          id: group.id,
          name: group.name,
          created_by: group.created_by,
          created_by_name: group.created_by_name,
          created_at: group.created_at,
          members: group.members,
          memberCount: parseInt(group.member_count),
          totalExpenses: 0
        },
        message: 'Group created successfully'
      });
      
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  let userId: string | null = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    userId = searchParams.get('userId');

    if (!groupId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Group ID and User ID are required' },
        { status: 400 }
      );
    }

    const db = await connectToPostgres();
    
    // Check if the user is the creator of the group
    const groupCheck = await db.query(
      'SELECT created_by FROM groups WHERE id = $1',
      [groupId]
    );
    
    if (groupCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }
    
    if (groupCheck.rows[0].created_by !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only the group creator can delete the group' },
        { status: 403 }
      );
    }
    
    // Start transaction
    await db.query('BEGIN');
    
    try {
      // Delete group messages
      await db.query('DELETE FROM group_messages WHERE group_id = $1', [groupId]);
      
      // Delete expense splits for expenses in this group
      await db.query(`
        DELETE FROM expense_splits 
        WHERE expense_id IN (SELECT id FROM expenses WHERE group_id = $1)
      `, [groupId]);
      
      // Delete expenses
      await db.query('DELETE FROM expenses WHERE group_id = $1', [groupId]);
      
      // Delete group members
      await db.query('DELETE FROM group_members WHERE group_id = $1', [groupId]);
      
      // Delete the group
      await db.query('DELETE FROM groups WHERE id = $1', [groupId]);
      
      // Commit transaction
      await db.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        message: 'Group deleted successfully'
      });
      
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error deleting group:', error);
    console.error('Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: userId
    });
    return NextResponse.json(
      { success: false, error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}
