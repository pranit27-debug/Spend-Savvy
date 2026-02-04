'use client';

import { useState, useEffect } from 'react';

interface ConfigStatus {
  email: {
    configured: boolean;
    service: string;
    user: string;
    from: string;
  };
  sms: {
    configured: boolean;
    service: string;
    accountSid: string;
    fromNumber: string;
    status: string;
  };
}

export default function TestNotifications() {
  const [emailStatus, setEmailStatus] = useState('');
  const [smsStatus, setSmsStatus] = useState('');
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Load configuration status on mount
  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const response = await fetch('/api/test-email');
      const data = await response.json();
      setConfigStatus(data.status);
    } catch (error) {
      console.error('Error checking configuration:', error);
    }
  };

  const testEmail = async (alertType: string) => {
    setLoading(true);
    setEmailStatus('Sending email...');
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'email',
          alertType: alertType,
          email: 'parent@example.com',
          childName: 'Test Child'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setEmailStatus(`✅ Email sent successfully! ${data.details || data.message}`);
      } else {
        setEmailStatus(`❌ Error: ${data.error} - ${data.details || ''}`);
      }
    } catch (error) {
      setEmailStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testSMS = async (alertType: string) => {
    setLoading(true);
    setSmsStatus('Sending SMS...');
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'sms',
          alertType: alertType,
          phone: '+919876543210',
          childName: 'Test Child'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSmsStatus(`✅ SMS sent successfully! ${data.details || data.message}`);
      } else {
        setSmsStatus(`❌ Error: ${data.error} - ${data.details || ''}`);
      }
    } catch (error) {
      setSmsStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testConfiguration = async () => {
    setLoading(true);
    setSmsStatus('Testing Twilio configuration...');
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'config'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSmsStatus(`✅ Configuration test completed! ${data.details || data.message}`);
      } else {
        setSmsStatus(`❌ Configuration Error: ${data.error} - ${data.details || ''}`);
      }
      
      // Refresh configuration status
      await checkConfiguration();
    } catch (error) {
      setSmsStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">
            🔔 Notification Testing Center
          </h1>
          
          {/* Configuration Status */}
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Configuration */}
            <div className="bg-blue-500/10 border border-blue-400/30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-blue-100 mb-4 flex items-center">
                📧 Email Configuration
                <span className={`ml-2 px-2 py-1 text-xs rounded ${
                  configStatus?.email.configured 
                    ? 'bg-green-500/20 text-green-300' 
                    : 'bg-orange-500/20 text-orange-300'
                }`}>
                  {configStatus?.email.configured ? 'READY' : 'FALLBACK'}
                </span>
              </h3>
              {configStatus && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-200">Service:</span>
                    <span className="text-white">{configStatus.email.service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">User:</span>
                    <span className="text-white">{configStatus.email.user}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">From:</span>
                    <span className="text-white">{configStatus.email.from}</span>
                  </div>
                </div>
              )}
            </div>

            {/* SMS Configuration */}
            <div className="bg-green-500/10 border border-green-400/30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-green-100 mb-4 flex items-center">
                📱 SMS Configuration
                <span className={`ml-2 px-2 py-1 text-xs rounded ${
                  configStatus?.sms.configured 
                    ? 'bg-green-500/20 text-green-300' 
                    : 'bg-red-500/20 text-red-300'
                }`}>
                  {configStatus?.sms.configured ? 'READY' : 'NOT CONFIGURED'}
                </span>
              </h3>
              {configStatus && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-200">Service:</span>
                    <span className="text-white">{configStatus.sms.service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-200">Account:</span>
                    <span className="text-white">{configStatus.sms.accountSid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-200">Number:</span>
                    <span className="text-white">{configStatus.sms.fromNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-200">Status:</span>
                    <span className="text-white">{configStatus.sms.status}</span>
                  </div>
                </div>
              )}
              <button
                onClick={testConfiguration}
                disabled={loading}
                className="mt-4 w-full bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-100 px-4 py-2 rounded-lg transition-all duration-300 disabled:opacity-50 text-sm"
              >
                🔄 Test Configuration
              </button>
            </div>
          </div>
          
          {/* Email Testing Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">📧 Email Notifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <button
                onClick={() => testEmail('safety_alert')}
                disabled={loading}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-100 px-6 py-4 rounded-lg transition-all duration-300 disabled:opacity-50"
              >
                <div className="text-2xl mb-2">🚨</div>
                <div className="font-semibold">Test Safety Alert Email</div>
                <div className="text-xs mt-1 opacity-80">Dangerous item detection</div>
              </button>
              <button
                onClick={() => testEmail('spending_alert')}
                disabled={loading}
                className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-100 px-6 py-4 rounded-lg transition-all duration-300 disabled:opacity-50"
              >
                <div className="text-2xl mb-2">💰</div>
                <div className="font-semibold">Test Spending Alert Email</div>
                <div className="text-xs mt-1 opacity-80">Budget threshold exceeded</div>
              </button>
            </div>
            {emailStatus && (
              <div className="bg-black/20 border border-white/20 p-4 rounded-lg">
                <p className="text-white font-mono text-sm">{emailStatus}</p>
              </div>
            )}
          </div>

          {/* SMS Testing Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">📱 SMS Notifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <button
                onClick={() => testSMS('safety_alert')}
                disabled={loading}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-100 px-6 py-4 rounded-lg transition-all duration-300 disabled:opacity-50"
              >
                <div className="text-2xl mb-2">🚨</div>
                <div className="font-semibold">Test Safety SMS</div>
                <div className="text-xs mt-1 opacity-80">AI-generated urgent message</div>
              </button>
              <button
                onClick={() => testSMS('spending_alert')}
                disabled={loading}
                className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-100 px-6 py-4 rounded-lg transition-all duration-300 disabled:opacity-50"
              >
                <div className="text-2xl mb-2">💰</div>
                <div className="font-semibold">Test Spending SMS</div>
                <div className="text-xs mt-1 opacity-80">Budget alert message</div>
              </button>
            </div>
            {smsStatus && (
              <div className="bg-black/20 border border-white/20 p-4 rounded-lg">
                <p className="text-white font-mono text-sm">{smsStatus}</p>
              </div>
            )}
          </div>

          {/* Information Panel */}
          <div className="bg-purple-500/10 border border-purple-400/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-purple-100 mb-3">ℹ️ Testing Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold text-purple-200 mb-2">📧 Email Testing:</h4>
                <ul className="text-purple-100 space-y-1">
                  <li>• Uses Gmail SMTP with environment variables</li>
                  <li>• Professional HTML templates with danger/amber UI</li>
                  <li>• Fallback to console logging if SMTP fails</li>
                  <li>• Test recipient: parent@example.com</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-purple-200 mb-2">📱 SMS Testing:</h4>
                <ul className="text-purple-100 space-y-1">
                  <li>• Uses Twilio API with provided credentials</li>
                  <li>• AI-generated messages via Google Gemini</li>
                  <li>• Test phone: +91-9876543210</li>
                  <li>• Messages under 160 characters</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
              <p className="text-yellow-100 text-sm">
                <strong>⚠️ Note:</strong> These are test notifications. In production, the system will automatically 
                send both email and SMS alerts to parents when children trigger safety or spending threshold alerts.
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="mt-6 text-center">
            <button
              onClick={checkConfiguration}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2 rounded-lg transition-all duration-300 disabled:opacity-50"
            >
              🔄 Refresh Configuration Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
