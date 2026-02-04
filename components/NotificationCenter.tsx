'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Balance {
  userId: string;
  userName: string;
  owesYou: number;
  youOwe: number;
  netBalance: number;
  expenses: Array<{
    description: string;
    amount: number;
    type: 'owes_you' | 'you_owe';
    date: string;
    category: string;
  }>;
}

interface NotificationCenterProps {
  userId: string;
}

interface Notification {
  id: string;
  message: string;
  type: string;
  data: any;
  createdAt: string;
  isRead: boolean;
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Fetch notification count
  const fetchNotificationCount = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.unreadCount);
          setHasNotifications(data.notifications.length > 0);
        }
      } else {
        console.error('Failed to fetch notifications:', response.status);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch notification count on component mount and periodically
  useEffect(() => {
    fetchNotificationCount();
    
    // Refresh notification count every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    
    return () => clearInterval(interval);
  }, [userId]);

  // Navigate to notifications page and mark as read
  const handleNotificationClick = async () => {
    // Mark all notifications as read
    if (unreadCount > 0) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            markAllAsRead: true
          }),
        });
        
        // Update local state immediately
        setUnreadCount(0);
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    }
    
    router.push('/notifications');
  };

  return (
    <div className="relative">
      {/* Enhanced Notification Button */}
      <button
        onClick={handleNotificationClick}
        className="relative p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 group shadow-lg hover:shadow-xl transform hover:-translate-y-1"
        title="Money Balances & Notifications"
      >
        <svg
          className="w-6 h-6 transition-transform group-hover:scale-110 group-hover:rotate-12"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold shadow-lg animate-bounce border-2 border-white">
            {unreadCount}
          </span>
        )}
        
        {/* Pulse effect for active notifications */}
        {unreadCount > 0 && (
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 animate-ping opacity-20"></span>
        )}
      </button>
    </div>
  );
}
