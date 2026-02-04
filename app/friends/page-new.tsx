'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  UserPlus, 
  ArrowLeft,
  MessageCircle,
  DollarSign,
  MoreVertical,
  X,
  Check,
  AlertCircle,
  UserMinus,
  Trash2,
  Send,
  Bell,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';

interface Friend {
  id: string;
  name: string;
  email: string;
  phone: string;
  friend_id?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

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

export default function Friends() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [friendEmail, setFriendEmail] = useState('');
  const [friendPhone, setFriendPhone] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dropdown and removal state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  const [removing, setRemoving] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check authentication on component mount
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
      setIsLoading(false);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/signin');
    }
  }, [router]);

  // Load friends when user is available
  useEffect(() => {
    if (user) {
      loadFriends();
      loadBalances();
    }
  }, [user]);

  // Handle clicks outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadFriends = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/friends?userId=${user.id}`);
      const data = await response.json();
      
      console.log('Friends API response:', data); // Debug log
      
      if (response.ok && data.success && Array.isArray(data.friends)) {
        setFriends(data.friends.map((f: any) => ({
          id: f.id,
          name: f.name,
          email: f.email,
          phone: f.phone || ''
        })));
      } else {
        console.error('Friends API error:', data);
        setError(data.error || 'Failed to load friends');
        setFriends([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      setError('Failed to load friends');
      setFriends([]); // Set empty array as fallback
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/balances?userId=${user.id}`);
      const data = await response.json();
      
      if (response.ok && data.success && Array.isArray(data.balances)) {
        setBalances(data.balances);
      } else {
        console.error('Balances API error:', data);
        setBalances([]);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
      setBalances([]);
    }
  };

  const handleAddFriend = async () => {
    if (!friendEmail && !friendPhone) {
      toast.error('Either email or phone number is required');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/friends/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          email: friendEmail || undefined,
          phone: friendPhone || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Friend added successfully!');
        setFriendEmail('');
        setFriendPhone('');
        setShowAddForm(false);
        
        // Small delay to ensure backend operations complete
        setTimeout(async () => {
          // Reload friends list and balances
          await loadFriends();
          await loadBalances();
        }, 100);
      } else {
        toast.error(result.error || 'Failed to add friend');
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      toast.error('Failed to add friend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async (searchValue: string) => {
    if (searchValue.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/users/search?term=${encodeURIComponent(searchValue)}`);
      const results = await response.json();
      
      if (response.ok) {
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendToRemove || !user) return;

    try {
      setRemoving(true);

      const response = await fetch('/api/friends', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          friendId: friendToRemove.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`${friendToRemove.name} has been removed from your friends list`, {
          style: { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
        });
        setShowRemoveDialog(false);
        setFriendToRemove(null);
        setOpenDropdown(null);
        
        // Small delay to ensure backend operations complete
        setTimeout(async () => {
          // Reload friends list and balances
          await loadFriends();
          await loadBalances();
        }, 100);
      } else {
        toast.error(result.error || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  const openRemoveDialog = (friend: Friend) => {
    // Check if this friend owes money
    const friendBalance = balances.find(b => b.userId === friend.id);
    const owedAmount = friendBalance ? friendBalance.netBalance : 0;
    
    if (owedAmount > 0) {
      // Friend owes money, show warning
      toast.error(`Cannot remove ${friend.name}. They owe you $${owedAmount.toFixed(2)}. Please settle the balance first before removing them as a friend.`);
      setOpenDropdown(null);
      return;
    }
    
    setFriendToRemove(friend);
    setShowRemoveDialog(true);
    setOpenDropdown(null);
  };

  const getFriendBalance = (friendId: string) => {
    return balances.find(b => b.userId === friendId) || {
      userId: friendId,
      userName: '',
      owesYou: 0,
      youOwe: 0,
      netBalance: 0,
      expenses: []
    };
  };

  const openBalanceModal = (friend: Friend) => {
    setSelectedFriend(friend);
    setShowBalanceModal(true);
    setOpenDropdown(null);
  };

  const sendReminder = async (friend: Friend) => {
    if (!user) return;
    
    const friendBalance = getFriendBalance(friend.id);
    if (friendBalance.netBalance <= 0) {
      toast.error(`${friend.name} doesn't owe you any money.`);
      return;
    }

    try {
      setSendingReminder(true);

      const response = await fetch('/api/friends/send-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromUserId: user.id,
          toUserId: friend.id,
          balance: friendBalance
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || `Reminder sent to ${friend.name} successfully!`);
        setOpenDropdown(null);
        setShowBalanceModal(false);
      } else {
        toast.error(result.error || 'Failed to send reminder');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder. Please try again.');
    } finally {
      setSendingReminder(false);
    }
  };

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.phone.includes(searchTerm) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-500 mx-auto mb-4"></div>
            <Users className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-500" />
          </div>
          <p className="text-slate-600 font-medium">Loading your friends...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <motion.div 
        className="flex justify-between items-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Friends
            </h1>
            <p className="text-slate-600 mt-1">Manage your friends for expense splitting</p>
          </div>
        </div>
      </motion.div>

      {/* Search and Add Section */}
      <motion.div 
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search friends by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearchUsers(e.target.value);
              }}
              className="pl-10 h-12 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={loading}
              className="h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 shadow-lg"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
              ) : (
                <UserPlus className="h-5 w-5 mr-2" />
              )}
              Add Friend
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Add Friend Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8"
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-2 rounded-lg">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Add New Friend</h2>
                <p className="text-slate-600">Add someone who already has an account</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="friend@example.com"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  className="h-12 border-slate-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number (Optional)
                </label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={friendPhone}
                  onChange={(e) => setFriendPhone(e.target.value)}
                  className="h-12 border-slate-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">Important Note</p>
                  <p className="text-sm text-blue-700">
                    Your friend must have already signed up for an account before you can add them.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1"
              >
                <Button 
                  onClick={handleAddFriend}
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium shadow-lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  ) : (
                    <UserPlus className="h-5 w-5 mr-2" />
                  )}
                  {loading ? 'Adding Friend...' : 'Add Friend'}
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setFriendEmail('');
                    setFriendPhone('');
                  }}
                  className="h-12 px-8 border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends List */}
      {loading && (
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-500 mx-auto"></div>
            <Users className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-500" />
          </div>
          <p className="text-slate-600 font-medium text-lg">Loading your friends...</p>
        </motion.div>
      )}
      
      {!loading && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <AnimatePresence>
            {filteredFriends.map((friend, index) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group"
              >
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <CardContent className="p-6">
                    {/* Friend Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 ring-4 ring-white shadow-lg">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${friend.name}`} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-semibold text-lg">
                            {friend.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                            {friend.name}
                          </h3>
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">
                            Friend
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="relative" ref={openDropdown === friend.id ? dropdownRef : null}>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setOpenDropdown(openDropdown === friend.id ? null : friend.id)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4 text-slate-600" />
                        </motion.button>
                        
                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {openDropdown === friend.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-10"
                            >
                              <div className="py-2">
                                <button
                                  onClick={() => openBalanceModal(friend)}
                                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-blue-50 transition-colors text-blue-600 hover:text-blue-700"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="font-medium">View Balance Details</span>
                                </button>
                                
                                {getFriendBalance(friend.id).netBalance > 0 && (
                                  <button
                                    onClick={() => sendReminder(friend)}
                                    disabled={sendingReminder}
                                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-green-50 transition-colors text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {sendingReminder ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent" />
                                    ) : (
                                      <Send className="h-4 w-4" />
                                    )}
                                    <span className="font-medium">
                                      {sendingReminder ? 'Sending...' : 'Send Payment Reminder'}
                                    </span>
                                  </button>
                                )}
                                
                                <div className="border-t border-slate-200 my-1"></div>
                                
                                <button
                                  onClick={() => openRemoveDialog(friend)}
                                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                                >
                                  <UserMinus className="h-4 w-4" />
                                  <span className="font-medium">Remove Friend</span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    
                    {/* Contact Info */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{friend.email}</span>
                      </div>
                      {friend.phone && (
                        <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span>{friend.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Balance Information */}
                    <div className="mb-6">
                      {(() => {
                        const balance = getFriendBalance(friend.id);
                        const netBalance = balance.netBalance;
                        
                        if (netBalance === 0) {
                          return (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center gap-3">
                                <div className="bg-gray-100 p-2 rounded-full">
                                  <Minus className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-700">All settled up!</p>
                                  <p className="text-sm text-gray-500">No outstanding balance</p>
                                </div>
                              </div>
                            </div>
                          );
                        } else if (netBalance > 0) {
                          return (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2 rounded-full">
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-green-700">
                                    {friend.name} owes you
                                  </p>
                                  <p className="text-2xl font-bold text-green-800">
                                    ${netBalance.toFixed(2)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => sendReminder(friend)}
                                  disabled={sendingReminder}
                                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Send payment reminder"
                                >
                                  {sendingReminder ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                  ) : (
                                    <Bell className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-center gap-3">
                                <div className="bg-red-100 p-2 rounded-full">
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-red-700">
                                    You owe {friend.name}
                                  </p>
                                  <p className="text-2xl font-bold text-red-800">
                                    ${Math.abs(netBalance).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1"
                      >
                        <Button 
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md"
                          size="sm"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Split Expense
                        </Button>
                      </motion.div>
                      
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-slate-200 hover:bg-slate-50"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && filteredFriends.length === 0 && (
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
          >
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
              <Users className="h-12 w-12 text-blue-500" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="text-2xl font-bold text-slate-700 mb-3">
              {searchTerm ? 'No friends found' : 'No friends yet'}
            </h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {searchTerm 
                ? 'Try adjusting your search terms or check the spelling.' 
                : 'Start building your network by adding friends to split expenses together.'
              }
            </p>
            
            {!searchTerm && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={() => setShowAddForm(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-8 py-3 text-lg shadow-lg"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add Your First Friend
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Remove Friend Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              Remove Friend
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              Are you sure you want to remove <strong>{friendToRemove?.name}</strong> from your friends list? 
              This action cannot be undone and you will need to add them again if you want to split expenses together.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveDialog(false);
                setFriendToRemove(null);
              }}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveFriend}
              disabled={removing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {removing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Removing...
                </>
              ) : (
                <>
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remove Friend
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Details Modal */}
      <Dialog open={showBalanceModal} onOpenChange={setShowBalanceModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedFriend && (() => {
            const balance = getFriendBalance(selectedFriend.id);
            const netBalance = balance.netBalance;
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedFriend.name}`} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-semibold">
                        {selectedFriend.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold">Balance with {selectedFriend.name}</h3>
                      <p className="text-sm text-gray-500">{selectedFriend.email}</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Net Balance Summary */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-600 mb-2">Net Balance</p>
                      {netBalance === 0 ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="bg-gray-100 p-3 rounded-full">
                            <Minus className="h-6 w-6 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-gray-700">$0.00</p>
                            <p className="text-sm text-gray-500">All settled up!</p>
                          </div>
                        </div>
                      ) : netBalance > 0 ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="bg-green-100 p-3 rounded-full">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-green-700">+${netBalance.toFixed(2)}</p>
                            <p className="text-sm text-green-600">{selectedFriend.name} owes you</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <div className="bg-red-100 p-3 rounded-full">
                            <TrendingDown className="h-6 w-6 text-red-600" />
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-red-700">-${Math.abs(netBalance).toFixed(2)}</p>
                            <p className="text-sm text-red-600">You owe {selectedFriend.name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Balance Breakdown */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-green-700 mb-1">They owe you</p>
                        <p className="text-2xl font-bold text-green-800">${balance.owesYou.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-red-700 mb-1">You owe them</p>
                        <p className="text-2xl font-bold text-red-800">${balance.youOwe.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Expenses */}
                  {balance.expenses.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        Recent Expenses
                      </h4>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {balance.expenses.slice(0, 10).map((expense, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-slate-800">{expense.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {expense.category}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {new Date(expense.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${
                                expense.type === 'owes_you' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {expense.type === 'owes_you' ? '+' : '-'}${expense.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {expense.type === 'owes_you' ? 'owes you' : 'you owe'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    {netBalance > 0 && (
                      <Button
                        onClick={() => sendReminder(selectedFriend)}
                        disabled={sendingReminder}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {sendingReminder ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Payment Reminder
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setShowBalanceModal(false)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
