import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { connectToPostgres } from '../../../../lib/db';

// Email template with beautiful styling
const createEmailTemplate = (
  fromUserName: string,
  toUserName: string,
  amount: number,
  expenses: Array<{
    description: string;
    amount: number;
    date: string;
    category: string;
  }>,
  fromUserEmail: string
) => {
  const expensesList = expenses.slice(0, 5).map(expense => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${expense.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; text-align: center;">${expense.category}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; text-align: right; font-weight: 600;">$${expense.amount.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; text-align: right;">${new Date(expense.date).toLocaleDateString()}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Reminder from ${fromUserName}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%);
            padding: 40px 24px;
            text-align: center;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: pulse 4s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.1; }
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 12px;
            position: relative;
            z-index: 1;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .header p {
            font-size: 18px;
            opacity: 0.95;
            position: relative;
            z-index: 1;
            font-weight: 400;
        }
        
        .content {
            padding: 32px 24px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 24px;
            color: #374151;
        }
        
        .amount-section {
            background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
            border-radius: 16px;
            padding: 32px 24px;
            text-align: center;
            margin: 32px 0;
            border: 2px solid #f59e0b;
            box-shadow: 0 8px 16px rgba(245, 158, 11, 0.2);
            position: relative;
            overflow: hidden;
        }
        
        .amount-section::before {
            content: '💰';
            position: absolute;
            top: -10px;
            right: -10px;
            font-size: 80px;
            opacity: 0.1;
            transform: rotate(15deg);
        }
        
        .amount-label {
            font-size: 16px;
            font-weight: 600;
            color: #92400e;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            position: relative;
            z-index: 1;
        }
        
        .amount-value {
            font-size: 56px;
            font-weight: 900;
            color: #92400e;
            text-shadow: 0 4px 8px rgba(146, 64, 14, 0.2);
            position: relative;
            z-index: 1;
            line-height: 1;
        }
        
        .expenses-section {
            margin: 32px 0;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .expenses-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .expense-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        .expense-card:hover {
            background: #f1f5f9;
            transform: translateY(-1px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .expense-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        
        .expense-description {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            flex: 1;
            margin-right: 12px;
        }
        
        .expense-amount {
            font-size: 18px;
            font-weight: 700;
            color: #dc2626;
            white-space: nowrap;
        }
        
        .expense-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #64748b;
        }
        
        .expense-category,
        .expense-date {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .category-icon,
        .date-icon {
            font-size: 12px;
        }
        
        .more-expenses {
            background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
            border: 1px solid #a5b4fc;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            margin-top: 8px;
        }
        
        .more-expenses-text {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 16px;
            color: #3730a3;
            margin-bottom: 4px;
        }
        
        .more-icon {
            font-size: 18px;
        }
        
        .more-expenses-subtext {
            font-size: 12px;
            color: #6366f1;
            opacity: 0.8;
        }
        
        .cta-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #0ea5e9;
            border-radius: 16px;
            padding: 32px 24px;
            text-align: center;
            margin: 32px 0;
            position: relative;
            overflow: hidden;
        }
        
        .cta-section::before {
            content: '💬';
            position: absolute;
            top: -20px;
            left: -20px;
            font-size: 100px;
            opacity: 0.05;
            transform: rotate(-15deg);
        }
        
        .cta-text {
            font-size: 18px;
            color: #0f172a;
            margin-bottom: 24px;
            line-height: 1.6;
            position: relative;
            z-index: 1;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 16px 40px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 700;
            font-size: 18px;
            box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
            transition: all 0.3s ease;
            position: relative;
            z-index: 1;
            border: none;
            cursor: pointer;
        }
        
        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 24px rgba(16, 185, 129, 0.4);
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }
        
        .footer-message {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
            color: #1e40af;
            font-size: 15px;
            line-height: 1.6;
            position: relative;
        }
        
        .footer-message::before {
            content: '💡';
            position: absolute;
            top: 8px;
            left: 16px;
            font-size: 20px;
        }
        
        .footer-message strong {
            color: #1d4ed8;
            margin-left: 32px;
        }
        
        .footer {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            color: #9ca3af;
            padding: 32px 24px;
            text-align: center;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .footer .brand {
            color: white;
            font-weight: 700;
            font-size: 18px;
            margin-bottom: 12px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content {
                padding: 24px 16px;
            }
            
            .header h1 {
                font-size: 28px;
            }
            
            .header p {
                font-size: 16px;
            }
            
            .amount-value {
                font-size: 42px;
            }
            
            .amount-section {
                padding: 24px 16px;
            }
            
            .expense-card {
                padding: 12px;
            }
            
            .expense-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            
            .expense-amount {
                font-size: 16px;
            }
            
            .expense-details {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }
            
            .cta-button {
                padding: 14px 32px;
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>💸 Payment Reminder</h1>
            <p>A friendly reminder from ${fromUserName} about your shared expenses</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hi <strong>${toUserName}</strong>! 👋
            </div>
            
            <p style="margin-bottom: 24px; font-size: 18px; color: #4b5563; line-height: 1.7;">
                Hope you're doing well! <strong>${fromUserName}</strong> wanted to send you a friendly reminder that you have an outstanding balance 
                from your shared expenses together. No rush – just keeping everyone on the same page! 😊
            </p>
            
            <div class="amount-section">
                <div class="amount-label">Total Amount Due</div>
                <div class="amount-value">$${amount.toFixed(2)}</div>
            </div>
            
            ${expenses.length > 0 ? `
            <div class="expenses-section">
                <div class="section-title">📋 Recent Shared Expenses</div>
                <div class="expenses-grid">
                    ${expenses.slice(0, 5).map(expense => `
                        <div class="expense-card">
                            <div class="expense-header">
                                <div class="expense-description">${expense.description}</div>
                                <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
                            </div>
                            <div class="expense-details">
                                <span class="expense-category">
                                    <span class="category-icon">🏷️</span>
                                    ${expense.category}
                                </span>
                                <span class="expense-date">
                                    <span class="date-icon">📅</span>
                                    ${new Date(expense.date).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                    ${expenses.length > 5 ? `
                        <div class="more-expenses">
                            <div class="more-expenses-text">
                                <span class="more-icon">📊</span>
                                <strong>+${expenses.length - 5} more expenses</strong>
                            </div>
                            <div class="more-expenses-subtext">Total across all shared activities</div>
                        </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <div class="cta-section">
                <div class="cta-text">
                    When you're ready to settle up, you can use any payment method that works for both of you.
                </div>
                <a href="mailto:${fromUserEmail}" class="cta-button">
                    💬 Reply to ${fromUserName}
                </a>
            </div>
            
            <div class="footer-message">
                <strong>💡 Pro tip:</strong> Keep track of your shared expenses easily with spendsavvy! 
                This email was sent through our automated reminder system to help friends stay on top of their shared costs.
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
                Thanks for being awesome about splitting expenses! We know life gets busy, so this is just a gentle 
                nudge to help everyone stay organized. No pressure – just keeping things transparent and fair for everyone! 🙌
            </p>
        </div>
        
        <div class="footer">
            <div class="brand">spendsavvy</div>
            <div>This reminder was sent by ${fromUserName} (${fromUserEmail}) through spendsavvy</div>
            <div style="margin-top: 12px; font-size: 12px;">
                Reply directly to this email to contact ${fromUserName}
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

export async function POST(request: NextRequest) {
  try {
    const {
      fromUserId,
      toUserId,
      balance
    } = await request.json();

    // Validate required fields
    if (!fromUserId || !toUserId || !balance) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if there's actually money owed
    if (balance.netBalance <= 0) {
      return NextResponse.json(
        { error: 'No outstanding balance to remind about' },
        { status: 400 }
      );
    }

    // Connect to database and fetch user details
    const pool = await connectToPostgres();
    
    // Fetch sender (from) user details
    const fromUserQuery = 'SELECT id, name, email FROM users WHERE id = $1';
    const fromUserResult = await pool.query(fromUserQuery, [fromUserId]);
    
    if (fromUserResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Sender user not found' },
        { status: 404 }
      );
    }
    
    const fromUser = fromUserResult.rows[0];
    console.log('📤 Sender details from DB:', { id: fromUser.id, name: fromUser.name, email: fromUser.email });

    // Fetch receiver (to) user details
    const toUserQuery = 'SELECT id, name, email FROM users WHERE id = $1';
    const toUserResult = await pool.query(toUserQuery, [toUserId]);
    
    if (toUserResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Receiver user not found' },
        { status: 404 }
      );
    }
    
    const toUser = toUserResult.rows[0];
    console.log('📥 Recipient details from DB:', { id: toUser.id, name: toUser.name, email: toUser.email });

    // Verify friendship exists
    const friendshipQuery = `
      SELECT 1 FROM friends 
      WHERE (user_id = $1 AND friend_id = $2) 
         OR (user_id = $2 AND friend_id = $1)
    `;
    const friendshipResult = await pool.query(friendshipQuery, [fromUserId, toUserId]);
    
    if (friendshipResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Users are not friends' },
        { status: 400 }
      );
    }

    // Fetch recent unpaid expenses between these users for email details
    const expensesQuery = `
      SELECT 
        e.description,
        es.amount,
        e.category,
        e.created_at
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE ((e.user_id = $1 AND es.user_id = $2) OR (e.user_id = $2 AND es.user_id = $1))
        AND COALESCE(es.paid, false) = false
      ORDER BY e.created_at DESC
      LIMIT 10
    `;
    const expensesResult = await pool.query(expensesQuery, [fromUserId, toUserId]);
    
    const recentExpenses = expensesResult.rows.map(row => ({
      description: row.description,
      amount: parseFloat(row.amount),
      category: row.category,
      date: row.created_at
    }));

    // Create email transporter
    console.log('Setting up email transporter with user:', process.env.EMAIL_USER);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email credentials not configured');
      return NextResponse.json(
        { error: 'Email service not configured. Please contact administrator.' },
        { status: 500 }
      );
    }
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Generate beautiful email HTML
    const emailHtml = createEmailTemplate(
      fromUser.name,
      toUser.name,
      balance.netBalance,
      recentExpenses,
      fromUser.email
    );

    // Email options
    const mailOptions = {
      from: {
        name: `${fromUser.name} (via spendsavvy)`,
        address: process.env.EMAIL_USER || 'noreply@spendsavvy.com'
      },
      replyTo: {
        name: fromUser.name,
        address: fromUser.email
      },
      to: toUser.email,
      subject: `💸 Payment reminder from ${fromUser.name}: $${balance.netBalance.toFixed(2)} outstanding`,
      html: emailHtml,
      // Fallback plain text version
      text: `
Hi ${toUser.name}!

This is a friendly reminder that you have an outstanding balance with ${fromUser.name}.

Amount Due: $${balance.netBalance.toFixed(2)}

${recentExpenses.length > 0 ? `
Recent expenses:
${recentExpenses.slice(0, 5).map((exp: any) => 
  `• ${exp.description}: $${exp.amount.toFixed(2)} (${exp.category}) - ${new Date(exp.date).toLocaleDateString()}`
).join('\n')}
` : ''}

When you're ready to settle up, you can reach out to ${fromUser.name} at ${fromUser.email}.

Thanks for keeping track of shared expenses!

Best regards,
spendsavvy Team
      `.trim()
    };

    // Send the email
    console.log(`📧 Sending email FROM: ${process.env.EMAIL_USER} TO: ${toUser.email} (${toUser.name})`);
    console.log(`💌 Subject: Reminder from ${fromUser.name} about $${balance.netBalance.toFixed(2)}`);
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');

    return NextResponse.json({
      success: true,
      message: `Payment reminder sent to ${toUser.name} (${toUser.email}) successfully!`
    });

  } catch (error) {
    console.error('Error sending reminder email:', error);
    
    // Handle specific email errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid login') || error.message.includes('EAUTH')) {
        return NextResponse.json(
          { error: 'Email authentication failed. Please check your Gmail App Password settings.' },
          { status: 500 }
        );
      }
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { error: 'Unable to connect to email service. Please try again later.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to send reminder email. Please try again.' },
      { status: 500 }
    );
  }
}
