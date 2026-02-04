'use client';

import { useState } from 'react';

export default function TestEmailPage() {
  const [testEmail, setTestEmail] = useState('');
  const [testType, setTestType] = useState<'safety_alert' | 'spending_threshold'>('safety_alert');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [emailStatus, setEmailStatus] = useState<any>(null);

  const checkEmailConfiguration = async () => {
    try {
      const response = await fetch('/api/test-email');
      const data = await response.json();
      setEmailStatus(data);
    } catch (error) {
      console.error('Error checking email configuration:', error);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testEmail,
          testType
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error sending test email:', error);
      setResult({
        success: false,
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check email configuration on component mount
  useState(() => {
    checkEmailConfiguration();
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              📧 Email Notification Test
            </h1>
            <p className="text-gray-600">
              Test the parent notification email system with enhanced danger UI
            </p>
          </div>

          {/* Email Configuration Status */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">📋 Email Configuration Status</h3>
            {emailStatus ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Email Service:</span>
                  <span className={emailStatus.status?.emailConfigured ? 'text-green-600' : 'text-orange-600'}>
                    {emailStatus.status?.emailService}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Email User:</span>
                  <span className={emailStatus.status?.emailUser === 'configured' ? 'text-green-600' : 'text-red-600'}>
                    {emailStatus.status?.emailUser}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>From Address:</span>
                  <span className="text-gray-600">{emailStatus.status?.emailFrom}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={emailStatus.status?.emailConfigured ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                    {emailStatus.status?.emailConfigured ? '✅ Ready' : '⚠️ Will log to console only'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Loading configuration...</p>
            )}
            <button
              onClick={checkEmailConfiguration}
              className="mt-3 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
            >
              🔄 Refresh Status
            </button>
          </div>

          {/* Test Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the email address where you want to receive the test notification
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTestType('safety_alert')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    testType === 'safety_alert'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-red-300'
                  }`}
                >
                  <div className="text-2xl mb-2">🚨</div>
                  <div className="font-semibold">Safety Alert</div>
                  <div className="text-xs mt-1">Unsafe item detection</div>
                </button>
                <button
                  onClick={() => setTestType('spending_threshold')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    testType === 'spending_threshold'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                  }`}
                >
                  <div className="text-2xl mb-2">💸</div>
                  <div className="font-semibold">Spending Alert</div>
                  <div className="text-xs mt-1">Threshold notification</div>
                </button>
              </div>
            </div>

            <button
              onClick={sendTestEmail}
              disabled={isLoading || !testEmail}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Sending Test Email...
                </span>
              ) : (
                `📧 Send Test ${testType === 'safety_alert' ? 'Safety Alert' : 'Spending Alert'}`
              )}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className={`mt-8 p-4 rounded-lg ${
              result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">
                  {result.success ? '✅' : '❌'}
                </span>
                <h3 className={`font-semibold ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.success ? 'Test Email Sent!' : 'Test Failed'}
                </h3>
              </div>
              <p className={`text-sm ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message || result.error}
              </p>
              {result.details && (
                <p className={`text-xs mt-2 ${
                  result.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.details}
                </p>
              )}
              {result.success && !result.emailConfigured && (
                <div className="mt-3 p-3 bg-orange-100 border border-orange-200 rounded text-orange-800 text-sm">
                  📝 <strong>Note:</strong> Email service is not fully configured. The HTML template has been logged to the console. 
                  To send actual emails, configure your email settings in the environment variables.
                </div>
              )}
            </div>
          )}

          {/* Configuration Help */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">🔧 Email Configuration Help</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>To enable actual email sending, add these environment variables:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code>EMAIL_SERVICE=gmail</code> (or sendgrid, custom)</li>
                <li><code>EMAIL_USER=your-email@gmail.com</code></li>
                <li><code>EMAIL_PASS=your-app-password</code></li>
                <li><code>EMAIL_FROM=your-email@gmail.com</code></li>
              </ul>
              <p className="mt-2 text-xs">
                💡 For Gmail, use an App Password instead of your regular password.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
