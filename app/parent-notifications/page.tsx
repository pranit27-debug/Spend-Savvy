'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ParentNotification {
  id: string;
  relationshipId: string;
  type: string;
  alertType: string;
  message: string;
  sentAt: string;
  childName: string;
  childEmail: string;
  thresholdAmount: number;
  isRead: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ParentNotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'safety_alert' | 'spending_threshold'>('all');
  const router = useRouter();

  // Check authentication and fetch data
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/signin');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Check if user is a parent
      if (parsedUser.role !== 'parent') {
        router.push('/chat');
        return;
      }
      
      fetchNotifications(token);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/signin');
    }
  }, [router]);

  const fetchNotifications = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/parent/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications);
        }
      } else {
        console.error('Failed to fetch parent notifications:', response.status);
      }
    } catch (error) {
      console.error('Error fetching parent notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (selectedFilter === 'safety_alert') return notification.type === 'safety_alert';
    if (selectedFilter === 'spending_threshold') return notification.type === 'spending_threshold';
    return true;
  });

  const getNotificationIcon = (type: string, alertType: string) => {
    if (type === 'safety_alert') return '🚨';
    if (type === 'spending_threshold') {
      if (alertType === 'threshold_100') return '💸';
      if (alertType === 'threshold_90') return '⚠️';
      if (alertType === 'threshold_50') return '📊';
    }
    return '🔔';
  };

  const getNotificationColor = (type: string, alertType: string) => {
    if (type === 'safety_alert') return 'from-red-500 to-red-600';
    if (type === 'spending_threshold') {
      if (alertType === 'threshold_100') return 'from-red-500 to-red-600';
      if (alertType === 'threshold_90') return 'from-orange-500 to-orange-600';
      if (alertType === 'threshold_50') return 'from-yellow-500 to-yellow-600';
    }
    return 'from-blue-500 to-blue-600';
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/signin');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium text-lg">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center space-x-4">
            <Link
              href="/child-monitoring"
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">🚨</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Parent Notifications
                </h1>
                <span className="text-sm text-gray-500 font-medium">Safety alerts and spending notifications</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link 
              href="/child-monitoring" 
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-5 py-2.5 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              👥 Child Monitoring
            </Link>
            <Link 
              href="/test-email" 
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              📧 Test Emails
            </Link>
            <button
              onClick={handleSignOut}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2.5 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-red-400 to-red-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Safety Alerts</p>
                <p className="text-3xl font-bold">
                  {notifications.filter(n => n.type === 'safety_alert').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">🚨</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-400 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Spending Alerts</p>
                <p className="text-3xl font-bold">
                  {notifications.filter(n => n.type === 'spending_threshold').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">💸</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Notifications</p>
                <p className="text-3xl font-bold">{notifications.length}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
              selectedFilter === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            🔄 All Notifications
          </button>
          <button
            onClick={() => setSelectedFilter('safety_alert')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
              selectedFilter === 'safety_alert'
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            🚨 Safety Alerts
          </button>
          <button
            onClick={() => setSelectedFilter('spending_threshold')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
              selectedFilter === 'spending_threshold'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            💸 Spending Alerts
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div key={notification.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
                <div className="flex items-start space-x-4">
                  {/* Notification Icon */}
                  <div className={`w-12 h-12 bg-gradient-to-r ${getNotificationColor(notification.type, notification.alertType)} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                    <span className="text-white text-xl">
                      {getNotificationIcon(notification.type, notification.alertType)}
                    </span>
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-800">{notification.childName}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          notification.type === 'safety_alert' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {notification.type === 'safety_alert' ? 'Safety Alert' : 'Spending Alert'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(notification.sentAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-3 leading-relaxed">{notification.message}</p>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Child:</span> {notification.childEmail}
                      </div>
                      {notification.type === 'spending_threshold' && notification.thresholdAmount > 0 && (
                        <div className="text-sm text-gray-500">
                          <span className="font-medium">Threshold:</span> ${notification.thresholdAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-5xl">✨</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-700 mb-4">
                {selectedFilter === 'all' ? 'No notifications yet!' : 
                 selectedFilter === 'safety_alert' ? 'No safety alerts!' : 
                 'No spending alerts!'}
              </h3>
              <p className="text-gray-500 mb-6">
                {selectedFilter === 'all' ? 'Your children haven\'t triggered any alerts yet.' :
                 'Try a different filter or check back later.'}
              </p>
              <Link
                href="/child-monitoring"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span>👥</span>
                <span>Manage Children</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
