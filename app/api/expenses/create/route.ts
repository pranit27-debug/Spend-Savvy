import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { cache, invalidateCache } from '../../../../lib/redis';
import { checkSpendingThresholds, checkBillForUnsafeItems } from '../../../../lib/notifications';
import { getChildTotalSpending } from '../../../../lib/database-functions';
import { categorizeExpenseWithEmbeddings } from '../../../../lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const { userId, expense } = await request.json();

    console.log('Creating expense with data:', { userId, expense });

    if (!userId || !expense) {
      return NextResponse.json(
        { error: 'userId and expense are required' },
        { status: 400 }
      );
    }

    const db = await connectToPostgres();

    // Generate expense ID
    const expenseId = uuidv4();

    // Get the correct amount (support both totalAmount and amount fields)
    const totalAmount = expense.totalAmount || expense.amount || 0;
    console.log('Total amount to save:', totalAmount);

    // Auto-categorize expense using embeddings if category not provided
    let category = expense.category;
    let subcategory = expense.subcategory;
    
    if (!category && expense.description) {
      console.log(`\n💫 [EXPENSE CATEGORIZATION] ============================================`);
      console.log(`📝 [EXPENSE CATEGORIZATION] Description: "${expense.description}"`);
      console.log(`🎯 [EXPENSE CATEGORIZATION] AUTO-CATEGORIZATION: Embeddings vs Manual Entry`);
      console.log(`💰 [EXPENSE CATEGORIZATION] Cost: FREE (local processing) vs Manual Work`);
      
      try {
        const categoryResult = await categorizeExpenseWithEmbeddings(expense.description);
        if (categoryResult.confidence > 0.4) { // Lower threshold for expense descriptions
          category = categoryResult.category;
          subcategory = categoryResult.subcategory || category;
          console.log(`✅ [EXPENSE SUCCESS] Auto-categorization successful!`);
          console.log(`📋 [EXPENSE SUCCESS] Result: ${category}/${subcategory}`);
          console.log(`📊 [EXPENSE SUCCESS] Confidence: ${(categoryResult.confidence * 100).toFixed(1)}%`);
          console.log(`🎯 [EXPENSE SUCCESS] Method: ${categoryResult.method.toUpperCase()}`);
          console.log(`⚡ [EXPENSE SUCCESS] User saved manual categorization work!`);
          console.log(`💫 [EXPENSE CATEGORIZATION] ============================================\n`);
        } else {
          console.log(`⚠️ [EXPENSE FALLBACK] Low confidence (${(categoryResult.confidence * 100).toFixed(1)}%), using default`);
          category = 'other';
          subcategory = 'miscellaneous';
          console.log(`📋 [EXPENSE FALLBACK] Default result: ${category}/${subcategory}`);
          console.log(`💫 [EXPENSE CATEGORIZATION] ============================================\n`);
        }
      } catch (error) {
        console.error('❌ [EXPENSE ERROR] Auto-categorization failed:', error);
        console.log(`🔄 [EXPENSE FALLBACK] Using default category...`);
        category = 'other';
        subcategory = 'miscellaneous';
        console.log(`📋 [EXPENSE FALLBACK] Default result: ${category}/${subcategory}`);
        console.log(`💫 [EXPENSE CATEGORIZATION] ============================================\n`);
      }
    } else if (category) {
      console.log(`\n👤 [MANUAL CATEGORY] User provided category: ${category}/${subcategory || 'default'}`);
      console.log(`💫 [MANUAL CATEGORY] Skipping auto-categorization (user preference)\n`);
    }

    // Insert the main expense record
    await db.query(
      `INSERT INTO expenses (id, user_id, category, subcategory, amount, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        expenseId,
        userId,
        category || 'other',
        subcategory || null,
        totalAmount,
        expense.description || ''
      ]
    );

    // Calculate and insert splits
    const splits = [];
    
    // Use Gemini's pre-calculated splits if available
    if (expense.splits && expense.splits.length > 0) {
      console.log('Using Gemini-calculated splits:', expense.splits);
      
      for (const split of expense.splits) {
        await db.query(
          `INSERT INTO expense_splits (expense_id, user_id, amount, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [expenseId, split.userId, split.amount]
        );

        splits.push({
          userId: split.userId,
          userName: split.userName,
          amount: split.amount,
          percentage: split.percentage
        });

        // Create notification for each friend involved (except the creator)
        if (split.userId !== userId) {
          await db.query(
            `INSERT INTO notifications (id, user_id, type, data, created_at, is_read)
             VALUES (gen_random_uuid(), $1, 'expense_split', $2, NOW(), false)`,
            [
              split.userId,
              JSON.stringify({
                expenseId: expenseId,
                amount: split.amount,
                description: expense.description,
                createdBy: userId,
                message: `You owe $${split.amount.toFixed(2)} for "${expense.description}"`
              })
            ]
          );
        }
      }
    } else {
      // Fallback to equal split if no pre-calculated splits
      console.log('Falling back to equal split calculation');
      const participants = expense.allParticipants || [];
      const equalShare = totalAmount / participants.length;

      for (const participant of participants) {
        const splitAmount = Math.round(equalShare * 100) / 100;
        
        await db.query(
          `INSERT INTO expense_splits (expense_id, user_id, amount, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [expenseId, participant.id, splitAmount]
        );

        // Create notification for each participant (except the creator)
        if (participant.id !== userId) {
          await db.query(
            `INSERT INTO notifications (id, user_id, type, data, created_at, is_read)
             VALUES (gen_random_uuid(), $1, 'expense_split', $2, NOW(), false)`,
            [
              participant.id,
              JSON.stringify({
                expenseId,
                amount: splitAmount,
                paidBy: expense.paidBy || userId,
                description: expense.description || 'Expense',
                message: `You owe $${splitAmount.toFixed(2)} for "${expense.description || 'Expense'}"`
              })
            ]
          );
        }

        splits.push({
          userId: participant.id,
          userName: participant.name,
          amount: splitAmount,
          percentage: Math.round((splitAmount / totalAmount) * 100 * 100) / 100
        });
      }
    }

    // Update user balances (optional - depends on your business logic)
    // For now, we'll just return the split information

    // Invalidate relevant caches
    await invalidateCache.expenses(userId);
    await invalidateCache.balances(userId);
    await invalidateCache.dashboard(userId);
    
    // Invalidate cache for all participants
    const allParticipants = expense.splits || expense.allParticipants || [];
    for (const participant of allParticipants) {
      const participantId = participant.userId || participant.id;
      if (participantId && participantId !== userId) {
        await invalidateCache.expenses(participantId);
        await invalidateCache.balances(participantId);
        await invalidateCache.notifications(participantId);
        await invalidateCache.dashboard(participantId);
      }
    }

    // CHILD MONITORING: Check if this expense involves monitored children
    await performChildMonitoringForExpense(userId, expense, totalAmount, allParticipants);

    return NextResponse.json({
      success: true,
      expenseId,
      splits,
      message: 'Expense created successfully'
    });

  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

// Child monitoring function for expense creation
async function performChildMonitoringForExpense(
  userId: string,
  expense: any,
  totalAmount: number,
  allParticipants: any[]
) {
  try {
    console.log(`🔍 [EXPENSE MONITORING] Checking if user ${userId} is a monitored child...`);
    
    const db = await connectToPostgres();
    
    // Check if the expense creator (userId) is a monitored child
    await checkUserForChildMonitoring(db, userId, expense, totalAmount);
    
    // Check if any participants are monitored children
    for (const participant of allParticipants) {
      const participantId = participant.userId || participant.id;
      if (participantId && participantId !== userId) {
        console.log(`🔍 [EXPENSE MONITORING] Checking if participant ${participantId} is a monitored child...`);
        await checkUserForChildMonitoring(db, participantId, expense, totalAmount);
      }
    }
    
  } catch (error) {
    console.error('[EXPENSE MONITORING] Error during expense monitoring checks:', error);
    // Don't throw error to avoid breaking the main expense creation flow
  }
}

// Helper function to check if a user is a monitored child and send notifications
async function checkUserForChildMonitoring(
  db: any,
  childUserId: string,
  expense: any,
  totalAmount: number
) {
  try {
    // Get parent relationships for this user (if they are a monitored child)
    const parentRelationships = await db.query(`
      SELECT 
        pcr.id as relationship_id,
        pcr.parent_id,
        pcr.child_id,
        pcr.threshold_amount,
        parent.name as parent_name,
        parent.email as parent_email,
        parent.phone as parent_phone,
        child.name as child_name,
        child.email as child_email
      FROM parent_child_relationships pcr
      JOIN users parent ON pcr.parent_id = parent.id
      JOIN users child ON pcr.child_id = child.id
      WHERE pcr.child_id = $1
    `, [childUserId]);

    if (parentRelationships.rows.length === 0) {
      console.log(`[EXPENSE MONITORING] User ${childUserId} is not being monitored by any parent`);
      return;
    }

    console.log(`🚨 [EXPENSE MONITORING] Found ${parentRelationships.rows.length} parent(s) monitoring this child!`);

    // Process each parent relationship
    for (const relationship of parentRelationships.rows) {
      console.log(`[EXPENSE MONITORING] Processing relationship ${relationship.relationship_id} for child ${relationship.child_name}`);
      
      // 1. Check for unsafe items in the expense description and category
      if (expense.description || expense.category) {
        console.log(`🔍 [EXPENSE MONITORING] Analyzing expense: "${expense.description}" (Category: ${expense.category})`);
        
        // Create a comprehensive description for AI analysis
        const fullDescription = [
          expense.description || '',
          expense.category || '',
          expense.subcategory || ''
        ].filter(Boolean).join(' - ');
        
        const mockBillItems = [{ 
          item_name: fullDescription, 
          price: totalAmount 
        }];
        
        const unsafeItemsDetected = await checkBillForUnsafeItems(
          mockBillItems,
          relationship.relationship_id,
          relationship.child_name,
          relationship.parent_email,
          relationship.parent_phone
        );
        
        if (unsafeItemsDetected) {
          console.log(`🚨 [EXPENSE MONITORING] UNSAFE ITEMS DETECTED in expense: "${fullDescription}"`);
        }
      }
      
      // 2. Check spending thresholds
      if (relationship.threshold_amount && parseFloat(relationship.threshold_amount) > 0) {
        // Get child's current total spending
        const currentSpending = await getChildTotalSpending(childUserId);
        
        console.log(`💸 [EXPENSE MONITORING] Child spending: $${currentSpending}, Threshold: $${relationship.threshold_amount}`);
        
        // Check and trigger threshold notifications
        await checkSpendingThresholds(
          relationship.relationship_id,
          childUserId,
          relationship.parent_email,
          relationship.parent_phone,
          relationship.child_name,
          currentSpending,
          parseFloat(relationship.threshold_amount)
        );
      }
    }
    
    console.log(`✅ [EXPENSE MONITORING] Completed monitoring checks for user ${childUserId}`);
  } catch (error) {
    console.error(`[EXPENSE MONITORING] Error checking user ${childUserId}:`, error);
  }
}
