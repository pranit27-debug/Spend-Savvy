'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, X, AlertTriangle, CreditCard, Users, User, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  type: 'expense' | 'payment' | 'reminder' | 'friend' | 'group';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  data?: {
    amount?: number;
    expenseId?: string;
    friendId?: string;
    groupId?: string;
    deadline?: string;
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'expense' | 'payment' | 'friend'>('all');

  // Load notifications from API (mocked)
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Mock data
        const mockNotifications: Notification[] = [
          {
            id: '1',
            type: 'expense',
            title: 'New expense added',
            message: 'Alex added a new expense "Dinner at Restaurant" ($80.00)',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            read: false,
            actionUrl: '/expenses',
            data: {
              amount: 80.0,
              expenseId: 'exp-123',
            },
          },
          {
            id: '2',
            type: 'payment',
            title: 'Payment reminder',
            message: 'You owe Jamie $25.50 for "Movie Night"',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            read: false,
            actionUrl: '/expenses',
            data: {
              amount: 25.5,
              expenseId: 'exp-456',
              deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
          {
            id: '3',
            type: 'friend',
            title: 'Friend request',
            message: 'Sarah sent you a friend request',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            read: true,
            actionUrl: '/friends',
            data: {
              friendId: 'user-789',
            },
          },
          {
            id: '4',
            type: 'group',
            title: 'Added to group',
            message: 'Robin added you to "Weekend Trip" group',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            read: true,
            actionUrl: '/groups',
            data: {
              groupId: 'group-123',
            },
          },
          {
            id: '5',
            type: 'expense',
            title: 'Expense settled',
            message: 'Casey settled their share of "Grocery Shopping" ($32.75)',
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
            read: true,
            data: {
              amount: 32.75,
              expenseId: 'exp-789',
            },
          },
          {
            id: '6',
            type: 'reminder',
            title: 'Payment deadline approaching',
            message: 'Reminder: Payment for "Utility Bills" ($45.00) is due tomorrow',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            read: true,
            data: {
              amount: 45.0,
              expenseId: 'exp-012',
              deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        ];
        
        setNotifications(mockNotifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expense':
        return <CreditCard className="h-5 w-5 text-blue-500" />;
      case 'payment':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'friend':
        return <User className="h-5 w-5 text-indigo-500" />;
      case 'group':
        return <Users className="h-5 w-5 text-emerald-500" />;
      case 'reminder':
        return <Calendar className="h-5 w-5 text-rose-500" />;
      default:
        return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  // Get notification badge color based on type
  const getNotificationBadgeClass = (type: string) => {
    switch (type) {
      case 'expense':
        return 'bg-blue-100 text-blue-800';
      case 'payment':
        return 'bg-amber-100 text-amber-800';
      case 'friend':
        return 'bg-indigo-100 text-indigo-800';
      case 'group':
        return 'bg-emerald-100 text-emerald-800';
      case 'reminder':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // Get formatted date
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today, show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // This week, show day name
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      // Older, show date
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-slate-900">
            <Bell className="text-blue-500" />
            Notifications
          </h1>
          <p className="text-slate-500 mt-1">Stay updated with your expenses and friends</p>
        </motion.div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
              className={filter === 'unread' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              Unread
            </Button>
            <Button
              variant={filter === 'expense' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('expense')}
              className={filter === 'expense' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              <CreditCard className="h-3.5 w-3.5 mr-1" />
              Expenses
            </Button>
            <Button
              variant={filter === 'payment' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('payment')}
              className={filter === 'payment' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Payments
            </Button>
            <Button
              variant={filter === 'friend' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('friend')}
              className={filter === 'friend' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              <User className="h-3.5 w-3.5 mr-1" />
              Friends
            </Button>
          </div>
          
          {notifications.some((n) => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="whitespace-nowrap text-blue-600"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/40 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } },
              hidden: {},
            }}
          >
            {filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }}
              >
                <Card
                  className={`border-0 shadow-md ${
                    !notification.read
                      ? 'bg-white ring-2 ring-blue-100'
                      : 'bg-white/80'
                  }`}
                >
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-semibold text-slate-900">
                              {notification.title}
                            </h3>
                            <Badge variant="outline" className={getNotificationBadgeClass(notification.type)}>
                              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-500">
                            {formatDate(notification.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-3">
                          {notification.message}
                        </p>
                        
                        <div className="flex justify-end gap-2">
                          {notification.actionUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                markAsRead(notification.id);
                                // In a real app, navigate to the action URL
                                // router.push(notification.actionUrl);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              View Details
                            </Button>
                          )}
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="text-slate-600"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Mark read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Remove notification
                              setNotifications((prev) =>
                                prev.filter((n) => n.id !== notification.id)
                              );
                            }}
                            className="text-slate-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow p-6 max-w-md mx-auto">
              <Bell className="h-12 w-12 mx-auto text-blue-300 mb-3" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No Notifications</h3>
              <p className="text-slate-500">
                {filter !== 'all'
                  ? `You don't have any ${filter} notifications at the moment`
                  : "You're all caught up! No new notifications."}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
