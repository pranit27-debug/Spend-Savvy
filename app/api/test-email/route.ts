import { testEmailConfiguration } from '@/lib/email-service';
import { sendEmailNotification } from '@/lib/notifications';
import { sendTwilioSMS, testTwilioConfiguration } from '@/lib/sms-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { testType, alertType = 'safety_alert', email, phone, childName = 'Test Child' } = await request.json();
    
    if (testType === 'email') {
      return await handleEmailTest(email, alertType, childName);
    } else if (testType === 'sms') {
      return await handleSMSTest(phone, alertType, childName);
    } else if (testType === 'config') {
      return await handleConfigTest();
    } else {
      // Legacy support for direct email testing
      return await handleEmailTest(email, alertType, childName);
    }
  } catch (error) {
    console.error('Error in test API:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleEmailTest(testEmail: string, alertType: string, childName: string) {
  if (!testEmail) {
    return NextResponse.json({ error: 'Test email address required' }, { status: 400 });
  }

  console.log('[EMAIL TEST] Testing email configuration...');
  const configValid = await testEmailConfiguration();
  
  if (!configValid) {
    console.log('[EMAIL TEST] Email not configured, but will show template in logs');
  }

  const testMessage = alertType === 'safety_alert' 
    ? `🚨 SAFETY ALERT: Your child ${childName} has purchased potentially unsafe items: Beer, Cigarettes. Please check with your child immediately.`
    : `⚠️ SPENDING ALERT: Your child ${childName} has spent 90% of their threshold (₹4,500 of ₹5,000) - Close to limit!`;

  const subject = alertType === 'safety_alert'
    ? '🚨 URGENT: Child Safety Alert - Test Notification'
    : '⚠️ Child Spending Alert: Test Notification';

  const additionalData = alertType === 'safety_alert' 
    ? {
        unsafeItems: ['Beer', 'Cigarettes'],
        childEmail: 'testchild@example.com',
        relationshipId: 'test-relationship-id',
        alertType: 'unsafe_item',
        detectionMethod: 'AI+Keywords'
      }
    : {
        currentSpending: 4500,
        thresholdAmount: 5000,
        progressPercentage: 90,
        relationshipId: 'test-relationship-id',
        alertType: 'threshold_90',
        level: 90
      };

  const emailSent = await sendEmailNotification(
    testEmail,
    subject,
    testMessage,
    alertType as 'safety_alert' | 'spending_threshold',
    childName,
    additionalData
  );

  return NextResponse.json({
    success: true,
    message: 'Test email notification sent',
    emailConfigured: configValid,
    emailSent,
    details: configValid 
      ? 'Email sent via configured service' 
      : 'Email not configured - check console logs for HTML template'
  });
}

async function handleSMSTest(testPhone: string, alertType: string, childName: string) {
  if (!testPhone) {
    return NextResponse.json({ error: 'Test phone number required' }, { status: 400 });
  }

  console.log('[SMS TEST] Testing SMS functionality...');
  
  const additionalData = alertType === 'safety_alert' 
    ? {
        unsafeItems: ['Beer', 'Cigarettes'],
        relationshipId: 'test-relationship-id',
        alertType: 'unsafe_item'
      }
    : {
        currentSpending: 4500,
        thresholdAmount: 5000,
        progressPercentage: 90,
        relationshipId: 'test-relationship-id',
        alertType: 'threshold_90',
        level: 90
      };

  try {
    const smsResult = await sendTwilioSMS(
      testPhone,
      alertType as 'safety_alert' | 'spending_alert',
      childName,
      additionalData
    );

    if (smsResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Test SMS sent successfully',
        details: `SMS sent to ${testPhone}. Message ID: ${smsResult.messageId}`
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'SMS failed to send',
        details: smsResult.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('SMS Test Error:', error);
    return NextResponse.json({
      success: false,
      error: 'SMS test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleConfigTest() {
  console.log('[CONFIG TEST] Testing Twilio configuration...');
  
  try {
    const configResult = await testTwilioConfiguration();
    
    return NextResponse.json({
      success: configResult.success,
      message: configResult.success ? 'Twilio configuration is valid' : 'Twilio configuration failed',
      details: configResult.message || configResult.error
    });
  } catch (error) {
    console.error('Configuration Test Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Configuration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Test email configuration
    const emailConfigValid = await testEmailConfiguration();
    
    // Test SMS configuration
    const smsConfigValid = await testTwilioConfiguration();
    
    const status = {
      email: {
        configured: emailConfigValid,
        service: process.env.EMAIL_SERVICE || 'not configured',
        user: process.env.EMAIL_USER ? 'configured' : 'not configured',
        from: process.env.EMAIL_FROM || 'noreply@spendsavvy.com'
      },
      sms: {
        configured: smsConfigValid,
        service: 'Twilio',
        accountSid: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not configured',
        fromNumber: process.env.TWILIO_PHONE_NUMBER || 'not configured',
        status: smsConfigValid ? 'Ready' : 'Configuration missing'
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Notification configuration status',
      status
    });

  } catch (error) {
    console.error('Error checking configuration:', error);
    return NextResponse.json(
      { error: 'Failed to check configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
