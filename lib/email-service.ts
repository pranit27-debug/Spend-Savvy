import nodemailer from 'nodemailer';

// Send email using the same approach as the working reminder system
export async function sendActualEmail(
  to: string,
  subject: string,
  textMessage: string,
  htmlMessage: string
): Promise<boolean> {
  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('[EMAIL] Email credentials not configured. Logging to console instead.');
      console.log(`[EMAIL FALLBACK] Would send email to ${to}`);
      console.log(`[EMAIL FALLBACK] Subject: ${subject}`);
      console.log(`[EMAIL FALLBACK] HTML: ${htmlMessage}`);
      return true; // Return true so notification logic continues
    }

    // Create transporter using the same configuration as the working reminder system
    console.log('[EMAIL] Setting up email transporter with user:', process.env.EMAIL_USER);
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email options matching the working reminder format
    const mailOptions = {
      from: {
        name: 'spendsavvy Safety Monitor',
        address: process.env.EMAIL_USER
      },
      to: to,
      subject: subject,
      html: htmlMessage,
      text: textMessage
    };

    // Send the email
    console.log(`[EMAIL] 📧 Sending email FROM: ${process.env.EMAIL_USER} TO: ${to}`);
    console.log(`[EMAIL] 💌 Subject: ${subject}`);
    
    await transporter.sendMail(mailOptions);
    
    console.log('[EMAIL] ✅ Email sent successfully!');
    return true;
    
  } catch (error) {
    console.error(`[EMAIL] Error sending email to ${to}:`, error);
    
    // Handle specific email errors like the reminder system does
    if (error instanceof Error) {
      if (error.message.includes('Invalid login') || error.message.includes('EAUTH')) {
        console.error('[EMAIL] Email authentication failed. Please check your Gmail App Password settings.');
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        console.error('[EMAIL] Unable to connect to email service. Please try again later.');
      }
    }
    
    return false;
  }
}

// Test email configuration using the same pattern
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('[EMAIL TEST] Email credentials not configured');
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.verify();
    console.log('[EMAIL TEST] ✅ Email configuration is valid');
    return true;
    
  } catch (error) {
    console.error('[EMAIL TEST] Email configuration test failed:', error);
    return false;
  }
}
