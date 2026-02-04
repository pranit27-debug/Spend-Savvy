import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      description, 
      amount, 
      category, 
      participants // Array of {id, name, splitAmount}
    } = await request.json();

    if (!userId || !description || !amount || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const db = await connectToPostgres();
    
    // Start transaction
    await db.query('BEGIN');

    try {
      // Create the expense record
      const expenseId = uuidv4();
      await db.query(
        `INSERT INTO expenses (id, user_id, category, amount, description, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [expenseId, userId, category, amount, description]
      );

      // Create expense splits for each participant
      for (const participant of participants) {
        await db.query(
          `INSERT INTO expense_splits (expense_id, user_id, amount, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [expenseId, participant.id, participant.splitAmount]
        );
      }

      // Update user balances
      for (const participant of participants) {
        if (participant.id === userId) {
          // The payer gets credited the total minus their share
          const creditAmount = amount - participant.splitAmount;
          await db.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2',
            [creditAmount, participant.id]
          );
        } else {
          // Other participants owe their share
          await db.query(
            'UPDATE users SET balance = balance - $1 WHERE id = $2',
            [participant.splitAmount, participant.id]
          );
        }
      }

      // Create notifications for other participants
      for (const participant of participants) {
        if (participant.id !== userId) {
          await db.query(
            `INSERT INTO notifications (id, user_id, message, status, created_at)
             VALUES ($1, $2, $3, 'pending', NOW())`,
            [
              uuidv4(),
              participant.id,
              `You owe $${participant.splitAmount} for "${description}" split by ${participants.find((p: any) => p.id === userId)?.name || 'someone'}`
            ]
          );
        }
      }

      await db.query('COMMIT');

      return NextResponse.json({
        success: true,
        expenseId,
        message: 'Expense saved successfully!'
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error saving expense:', error);
    return NextResponse.json(
      { error: 'Failed to save expense' },
      { status: 500 }
    );
  }
}
