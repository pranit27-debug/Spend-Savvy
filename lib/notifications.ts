import { checkNotificationSent, logNotification } from './database-functions';
import { sendActualEmail } from './email-service';
import { sendTwilioSMS } from './sms-service';

// Email notification with enhanced HTML templates
export async function sendEmailNotification(
  recipientEmail: string, 
  subject: string, 
  message: string,
  notificationType: 'safety_alert' | 'spending_threshold' = 'safety_alert',
  childName?: string,
  additionalData?: any
): Promise<boolean> {
  try {
    console.log(`[EMAIL NOTIFICATION]`);
    console.log(`To: ${recipientEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Type: ${notificationType}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Create HTML template based on notification type
    const htmlTemplate = generateEmailTemplate(message, notificationType, childName, additionalData);
    
    // Send the actual email
    const emailSent = await sendActualEmail(recipientEmail, subject, message, htmlTemplate);
    
    if (emailSent) {
      console.log(`[EMAIL] Successfully sent ${notificationType} notification to ${recipientEmail}`);
    } else {
      console.error(`[EMAIL] Failed to send ${notificationType} notification to ${recipientEmail}`);
    }
    
    return emailSent;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

// Generate HTML email template
function generateEmailTemplate(
  message: string, 
  type: 'safety_alert' | 'spending_threshold',
  childName?: string,
  additionalData?: any
): string {
  const isUrgent = type === 'safety_alert';
  const primaryColor = isUrgent ? '#dc2626' : '#f59e0b'; // red for urgent, amber for spending
  const backgroundColor = isUrgent ? '#fef2f2' : '#fffbeb';
  const iconEmoji = isUrgent ? '🚨' : '💸';
  const alertTitle = isUrgent ? 'URGENT SAFETY ALERT' : 'SPENDING NOTIFICATION';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${alertTitle}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          margin: 0; 
          padding: 0; 
          background-color: #f9fafb; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          border-radius: 12px; 
          overflow: hidden; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .header { 
          background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd); 
          color: white; 
          padding: 24px; 
          text-align: center; 
        }
        .alert-icon { 
          font-size: 48px; 
          margin-bottom: 12px; 
          display: block; 
        }
        .alert-title { 
          font-size: 24px; 
          font-weight: bold; 
          margin: 0; 
          text-transform: uppercase; 
          letter-spacing: 1px; 
        }
        .content { 
          padding: 32px 24px; 
        }
        .alert-box { 
          background-color: ${backgroundColor}; 
          border-left: 4px solid ${primaryColor}; 
          padding: 16px; 
          margin: 16px 0; 
          border-radius: 6px; 
        }
        .message { 
          font-size: 16px; 
          line-height: 1.6; 
          color: #374151; 
          margin: 16px 0; 
        }
        .child-info { 
          background-color: #f3f4f6; 
          padding: 16px; 
          border-radius: 8px; 
          margin: 16px 0; 
        }
        .action-button { 
          display: inline-block; 
          background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd); 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: bold; 
          margin: 16px 0; 
        }
        .footer { 
          background-color: #f9fafb; 
          padding: 24px; 
          text-align: center; 
          color: #6b7280; 
          font-size: 14px; 
        }
        .timestamp { 
          color: #9ca3af; 
          font-size: 12px; 
          margin-top: 16px; 
        }
        ${isUrgent ? '.urgent-border { border: 3px solid #dc2626; animation: pulse 2s infinite; }' : ''}
        @keyframes pulse { 
          0%, 100% { border-color: #dc2626; } 
          50% { border-color: #f87171; } 
        }
      </style>
    </head>
    <body>
      <div class="container ${isUrgent ? 'urgent-border' : ''}">
        <div class="header">
          <span class="alert-icon">${iconEmoji}</span>
          <h1 class="alert-title">${alertTitle}</h1>
          ${childName ? `<p style="margin: 8px 0 0 0; opacity: 0.9;">Regarding your child: ${childName}</p>` : ''}
        </div>
        
        <div class="content">
          <div class="alert-box">
            <strong>${isUrgent ? '⚠️ IMMEDIATE ATTENTION REQUIRED' : '📊 SPENDING UPDATE'}</strong>
          </div>
          
          <div class="message">
            ${message}
          </div>
          
          ${childName ? `
          <div class="child-info">
            <h3 style="margin: 0 0 8px 0; color: #374151;">Child Information</h3>
            <p style="margin: 0; color: #6b7280;">Name: <strong>${childName}</strong></p>
            ${additionalData?.childEmail ? `<p style="margin: 4px 0 0 0; color: #6b7280;">Email: ${additionalData.childEmail}</p>` : ''}
          </div>
          ` : ''}
          
          ${additionalData?.unsafeItems ? `
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h4 style="margin: 0 0 8px 0; color: #dc2626;">🚨 Unsafe Items Detected:</h4>
            <ul style="margin: 0; color: #7f1d1d;">
              ${additionalData.unsafeItems.map((item: string) => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${additionalData?.currentSpending && additionalData?.thresholdAmount ? `
          <div style="background-color: #fffbeb; border: 1px solid #fed7aa; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h4 style="margin: 0 0 8px 0; color: #92400e;">💰 Spending Details:</h4>
            <p style="margin: 0; color: #92400e;">Current: <strong>₹${additionalData.currentSpending.toFixed(2)}</strong></p>
            <p style="margin: 4px 0 0 0; color: #92400e;">Threshold: <strong>₹${additionalData.thresholdAmount.toFixed(2)}</strong></p>
            <p style="margin: 4px 0 0 0; color: #92400e;">Progress: <strong>${((additionalData.currentSpending / additionalData.thresholdAmount) * 100).toFixed(1)}%</strong></p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.APP_DOMAIN || 'http://localhost:3000'}/parent-notifications" class="action-button">
              📱 View All Notifications
            </a>
          </div>
          
          ${isUrgent ? `
          <div style="background-color: #dc2626; color: white; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
            <strong>🚨 IMMEDIATE ACTION RECOMMENDED</strong><br>
            <span style="font-size: 14px; opacity: 0.9;">Please contact your child immediately to discuss this alert.</span>
          </div>
          ` : ''}
          
          <div class="timestamp">
            Sent: ${new Date().toLocaleString()}
          </div>
        </div>
        
        <div class="footer">
          <p style="margin: 0;">spendsavvy - Child Safety & Spending Monitor</p>
          <p style="margin: 8px 0 0 0; font-size: 12px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// SMS notifications have been replaced by Twilio SMS service
// The sendTwilioSMS function is now used for direct parent notifications

// Check child spending and trigger notifications if necessary
export async function checkSpendingThresholds(relationshipId: string, childId: string, parentEmail: string, parentPhone: string, childName: string, currentSpending: number, thresholdAmount: number) {
  try {
    if (thresholdAmount <= 0) return; // No threshold set
    
    const progressPercentage = (currentSpending / thresholdAmount) * 100;
    
    // Define threshold levels
    const thresholds = [
      { level: 50, alertType: 'threshold_50', message: `${childName} has spent 50% of their threshold ($${currentSpending.toFixed(2)} of $${thresholdAmount.toFixed(2)})` },
      { level: 90, alertType: 'threshold_90', message: `${childName} has spent 90% of their threshold ($${currentSpending.toFixed(2)} of $${thresholdAmount.toFixed(2)}) - Close to limit!` },
      { level: 100, alertType: 'threshold_100', message: `${childName} has exceeded their spending threshold! ($${currentSpending.toFixed(2)} of $${thresholdAmount.toFixed(2)})` }
    ];
    
    for (const threshold of thresholds) {
      if (progressPercentage >= threshold.level) {
        // Check if we've already sent this notification
        const alreadySent = await checkNotificationSent(relationshipId, threshold.alertType);
        
        if (!alreadySent) {
          // Send email notification with enhanced UI
          const emailSubject = progressPercentage >= 100 
            ? `🚨 Child Spending Alert: Threshold Exceeded`
            : `⚠️ Child Spending Alert: ${threshold.level}% Threshold Reached`;
          
          await sendEmailNotification(
            parentEmail, 
            emailSubject, 
            threshold.message,
            'spending_threshold',
            childName,
            {
              currentSpending,
              thresholdAmount,
              progressPercentage,
              relationshipId,
              alertType: threshold.alertType,
              level: threshold.level
            }
          );
          
          // Send SMS notification via Twilio if phone available
          if (parentPhone) {
            const smsResult = await sendTwilioSMS(
              parentPhone,
              'spending_threshold',
              childName,
              {
                currentSpending,
                thresholdAmount,
                progressPercentage,
                relationshipId,
                alertType: threshold.alertType,
                level: threshold.level
              }
            );
            
            if (smsResult.success) {
              console.log(`[SMS] Spending alert SMS sent successfully. Message ID: ${smsResult.messageId}`);
            } else {
              console.error(`[SMS] Failed to send spending alert SMS: ${smsResult.error}`);
            }
          } else {
            console.log('[SMS] Parent phone number not available for spending threshold alert');
          }
          
          // Log notification to prevent duplicates
          await logNotification(relationshipId, 'spending_threshold', threshold.alertType, threshold.message);

          // Also store in main notifications table for the parent
          try {
            // Get parent ID from relationship
            const { connectToPostgres } = await import('./db');
            const pool = await connectToPostgres();
            const parentQuery = `SELECT parent_id FROM parent_child_relationships WHERE id = $1`;
            const parentResult = await pool.query(parentQuery, [relationshipId]);
            
            if (parentResult.rows.length > 0) {
              const parentId = parentResult.rows[0].parent_id;
              
              // Insert into notifications table
              const notificationQuery = `
                INSERT INTO notifications (id, user_id, type, message, data, created_at, is_read)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), false)
              `;
              
              await pool.query(notificationQuery, [
                parentId,
                'spending_threshold',
                threshold.message,
                JSON.stringify({
                  childName,
                  childId,
                  currentSpending,
                  thresholdAmount,
                  progressPercentage,
                  relationshipId,
                  alertType: threshold.alertType,
                  level: threshold.level
                })
              ]);
            }
          } catch (dbError) {
            console.error('Error storing notification in notifications table:', dbError);
          }
          
          console.log(`Spending threshold notification sent for ${childName}: ${threshold.alertType}`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking spending thresholds:', error);
  }
}

// Keywords for unsafe item detection
const UNSAFE_KEYWORDS = [
  // Alcohol
  'alcohol', 'beer', 'wine', 'vodka', 'whiskey', 'rum', 'gin', 'tequila', 'brandy', 'champagne',
  'liquor', 'spirits', 'bourbon', 'scotch', 'cocktail', 'martini', 'margarita',
  
  // Tobacco
  'cigarette', 'cigar', 'tobacco', 'nicotine', 'vape', 'e-cigarette', 'smoking',
  
  // Drugs (recreational)
  'weed', 'marijuana', 'cannabis', 'cbd', 'thc', 'edible', 'joint', 'blunt',
  
  // Unsafe items
  'knife', 'weapon', 'firearm', 'gun', 'ammunition', 'blade',
  
  // Adult content
  'adult', 'xxx', 'pornography', 'strip club', 'escort'
];

// Safe context words that should prevent false positives
const SAFE_CONTEXT_WORDS = [
  'wipes', 'sanitizer', 'cleaning', 'medical', 'rubbing', 'isopropyl',
  'cooking', 'vanilla extract', 'mouthwash', 'perfume', 'cologne'
];

// Check bill items for unsafe content using AI/LLM for intelligent detection
export async function checkBillForUnsafeItems(
  billItems: { item_name: string; price: number }[],
  relationshipId: string,
  childName: string,
  parentEmail: string,
  parentPhone: string
) {
  try {
    console.log(`🔍 [SAFETY AI] Analyzing ${billItems.length} items for potentially hazardous consumables...`);
    
    // Use AI-powered detection first (more accurate)
    const aiDetectedItems = await detectUnsafeItemsWithAI(billItems);
    
    // Fallback to keyword matching for reliability
    const keywordDetectedItems = await detectUnsafeItemsWithKeywords(billItems);
    
    // Combine both detection methods
    const allUnsafeItems = [...new Set([...aiDetectedItems, ...keywordDetectedItems])];
    
    if (allUnsafeItems.length > 0) {
      const message = `🚨 SAFETY ALERT: ${childName} has purchased potentially unsafe items: ${allUnsafeItems.join(', ')}. Please check with your child immediately.`;
      
      console.log(`🚨 [SAFETY AI] HAZARDOUS ITEMS DETECTED: ${allUnsafeItems.join(', ')}`);
      
      // Send immediate notifications with enhanced UI
      await sendEmailNotification(
        parentEmail, 
        '🚨 URGENT: Child Safety Alert - Unsafe Purchase Detected',
        message,
        'safety_alert',
        childName,
        {
          unsafeItems: allUnsafeItems,
          childEmail: parentEmail, // You might want to get actual child email
          relationshipId,
          alertType: 'unsafe_item',
          detectionMethod: 'AI+Keywords'
        }
      );
      
      // Send SMS alert via Twilio
      if (parentPhone) {
        const smsResult = await sendTwilioSMS(
          parentPhone,
          'safety_alert',
          childName,
          {
            unsafeItems: allUnsafeItems,
            relationshipId,
            alertType: 'unsafe_item'
          }
        );
        
        if (smsResult.success) {
          console.log(`[SMS] Safety alert SMS sent successfully. Message ID: ${smsResult.messageId}`);
        } else {
          console.error(`[SMS] Failed to send safety alert SMS: ${smsResult.error}`);
        }
      } else {
        console.log('[SMS] Parent phone number not available for safety alert');
      }
      
      // Log the safety alert in notification_logs
      await logNotification(relationshipId, 'safety_alert', 'unsafe_item', message);

      // Also store in main notifications table for the parent
      try {
        // Get parent ID from relationship
        const { connectToPostgres } = await import('./db');
        const pool = await connectToPostgres();
        const parentQuery = `SELECT parent_id FROM parent_child_relationships WHERE id = $1`;
        const parentResult = await pool.query(parentQuery, [relationshipId]);
        
        if (parentResult.rows.length > 0) {
          const parentId = parentResult.rows[0].parent_id;
          
          // Insert into notifications table
          const notificationQuery = `
            INSERT INTO notifications (id, user_id, type, message, data, created_at, is_read)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), false)
          `;
          
          await pool.query(notificationQuery, [
            parentId,
            'safety_alert',
            message,
            JSON.stringify({
              childName,
              unsafeItems: allUnsafeItems,
              relationshipId,
              alertType: 'unsafe_item',
              detectionMethod: 'AI+Keywords'
            })
          ]);
        }
      } catch (dbError) {
        console.error('Error storing notification in notifications table:', dbError);
      }
      
      console.log(`✅ [SAFETY AI] Safety alert sent for ${childName}: unsafe items detected - ${allUnsafeItems.join(', ')}`);
      
      return true; // Alert was triggered
    }
    
    console.log(`✅ [SAFETY AI] No hazardous items detected for ${childName}`);
    return false; // No unsafe items detected
  } catch (error) {
    console.error('Error checking bill for unsafe items:', error);
    return false;
  }
}

// AI-powered unsafe item detection using Gemini
async function detectUnsafeItemsWithAI(billItems: { item_name: string; price: number }[]): Promise<string[]> {
  try {
    console.log(`🤖 [SAFETY AI] Running AI analysis on ${billItems.length} items...`);
    
    // Import Gemini here to avoid circular dependencies
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const itemsList = billItems.map(item => `- ${item.item_name} ($${item.price})`).join('\n');
    
    const prompt = `
You are a child safety AI assistant. Analyze the following bill items and identify ANY potentially harmful or inappropriate purchases for minors (under 18).

BILL ITEMS:
${itemsList}

DETECTION CRITERIA - Flag items that are:
1. ALCOHOL: Any alcoholic beverages, beer, wine, spirits, liquor stores, bars, breweries
2. TOBACCO: Cigarettes, cigars, vaping products, e-cigarettes, smoking accessories  
3. DRUGS: Cannabis, marijuana, CBD products, drug paraphernalia
4. WEAPONS: Knives, firearms, ammunition, dangerous tools
5. ADULT CONTENT: Strip clubs, adult entertainment, inappropriate venues
6. DANGEROUS SUBSTANCES: Chemical products, inhalants, toxic materials
7. COMPANY NAMES: Liquor stores, tobacco shops, dispensaries, adult venues

IMPORTANT:
- Look for INDIRECT indicators (company names like "Paramount Liquor", "Smoke Shop", etc.)
- Consider CONTEXT (a "bar" might be chocolate or a drinking establishment)
- Be INTELLIGENT about false positives (vanilla extract vs alcoholic drinks)
- Focus on items that pose REAL safety risks to minors

Return ONLY a JSON array of unsafe items in this exact format:
["Item Name ($Price)", "Item Name ($Price)"]

If NO unsafe items are found, return: []

Examples:
- "PARAMOUNT LIQUOR" store → ["Liquor Store Purchase ($50.00)"]
- "Beer" → ["Beer ($15.99)"]
- "Vanilla Extract" → [] (cooking ingredient, safe)
- "Knife Set" → ["Knife Set ($29.99)"] (potentially dangerous)
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log(`🤖 [SAFETY AI] Raw AI response: ${text}`);
    
    // Clean the response and parse the JSON
    try {
      // Remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\s*/g, '').replace(/```\s*$/g, '');
      }
      
      // Remove any extra whitespace
      cleanText = cleanText.trim();
      
      console.log(`🤖 [SAFETY AI] Cleaned response: ${cleanText}`);
      
      const unsafeItems = JSON.parse(cleanText);
      
      if (Array.isArray(unsafeItems)) {
        console.log(`🤖 [SAFETY AI] AI detected ${unsafeItems.length} unsafe items: ${unsafeItems.join(', ')}`);
        return unsafeItems;
      } else {
        console.log(`🤖 [SAFETY AI] AI response was not an array, falling back to keyword detection`);
        return [];
      }
    } catch (parseError) {
      console.error(`🤖 [SAFETY AI] Failed to parse AI response, falling back to keyword detection:`, parseError);
      return [];
    }
    
  } catch (error) {
    console.error('🤖 [SAFETY AI] Error in AI detection:', error);
    return []; // Fall back to keyword detection
  }
}

// Keyword-based detection (fallback method)
async function detectUnsafeItemsWithKeywords(billItems: { item_name: string; price: number }[]): Promise<string[]> {
  const unsafeItems: string[] = [];
  
  for (const item of billItems) {
    const itemName = item.item_name.toLowerCase();
    
    // Check if item contains unsafe keywords
    const hasUnsafeKeyword = UNSAFE_KEYWORDS.some(keyword => 
      itemName.includes(keyword.toLowerCase())
    );
    
    if (hasUnsafeKeyword) {
      // Check for safe context to avoid false positives
      const hasSafeContext = SAFE_CONTEXT_WORDS.some(safeWord => 
        itemName.includes(safeWord.toLowerCase())
      );
      
      if (!hasSafeContext) {
        unsafeItems.push(`${item.item_name} ($${item.price.toFixed(2)})`);
      }
    }
  }
  
  console.log(`🔑 [SAFETY KEYWORDS] Keyword detection found ${unsafeItems.length} unsafe items`);
  return unsafeItems;
}
