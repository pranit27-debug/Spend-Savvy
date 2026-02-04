'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Bell,
  DollarSign,
  Eye,
  Mail,
  MessageCircle,
  Minus,
  MoreVertical,
  Phone,
  Search,
  Send,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
    <div className="relative bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 min-h-screen overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-10 -left-10 w-72 h-72 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl mix-blend-lighten"
        />
        <motion.div
          animate={{
            x: [0, -150, 0],
            y: [0, 100, 0],
            scale: [1.2, 1, 1.2],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/2 -right-10 w-96 h-96 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-full blur-3xl mix-blend-lighten"
        />
        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -80, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-10 left-1/3 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl mix-blend-lighten"
        />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div 
          className="flex justify-between items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-3 rounded-xl shadow-lg">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Friends
              </h1>
              <p className="text-gray-400 mt-1 text-lg">Manage your friends for expense splitting</p>
            </div>
          </div>
          
          {/* Friends Count Badge */}
          {friends.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-full px-4 py-2 shadow-lg"
            >
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="h-4 w-4" />
                <span className="font-semibold">{friends.length} Friend{friends.length === 1 ? '' : 's'}</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Search and Add Section */}
        <motion.div 
          className="bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-700/50 hover:border-gray-600/70 p-8 mb-8 relative overflow-hidden transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ 
            y: -2,
            boxShadow: "0 15px 35px rgba(0, 0, 0, 0.3)"
          }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-purple-500/5 rounded-3xl"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-400/10 to-transparent rounded-full transform translate-x-16 -translate-y-16"></div>
          
          <div className="relative flex flex-col md:flex-row gap-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search friends by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
                className="pl-12 h-14 bg-gray-700/50 border-gray-600 focus:ring-2 focus:ring-violet-500 focus:border-transparent rounded-xl text-base shadow-sm text-white placeholder:text-gray-400"
              />
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={() => setShowAddForm(!showAddForm)}
                disabled={loading}
                className="h-14 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-8 shadow-lg rounded-xl font-semibold text-base"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                ) : (
                  <UserPlus className="h-5 w-5 mr-3" />
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
            className="bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-700/50 hover:border-gray-600/70 p-8 mb-8 transition-all duration-300"
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            whileHover={{ 
              y: -2,
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.3)"
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-r from-emerald-400 to-green-500 p-2 rounded-lg">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Add New Friend</h2>
                <p className="text-gray-400">Add someone who already has an account</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="friend@example.com"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  className="h-12 bg-gray-700/50 border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder:text-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number (Optional)
                </label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={friendPhone}
                  onChange={(e) => setFriendPhone(e.target.value)}
                  className="h-12 bg-gray-700/50 border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            
            <div className="bg-blue-900/50 border border-blue-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-300 mb-1">Important Note</p>
                  <p className="text-sm text-blue-400">
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
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-medium shadow-lg"
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
                  className="h-12 px-8 border-gray-600 hover:bg-gray-700/50 text-gray-300 hover:text-white"
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
            className="bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-700/50 p-16 text-center relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 to-purple-900/20 rounded-3xl"></div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/20 rounded-full transform translate-x-12 -translate-y-12 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-600/20 rounded-full transform -translate-x-16 translate-y-16 animate-pulse"></div>
            
            <div className="relative mb-8">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-violet-600/30 border-t-violet-500 mx-auto shadow-lg"></div>
              <Users className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-violet-400" />
            </div>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <p className="text-gray-300 font-semibold text-xl">Loading your amazing friends...</p>
              <p className="text-gray-400 text-sm mt-2">Getting all the good stuff ready 🚀</p>
            </motion.div>
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
                whileHover={{ 
                  y: -8, 
                  scale: 1.02,
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)"
                }}
                className="group h-full"
              >
                <Card className="border-0 shadow-xl bg-gray-800/80 backdrop-blur-lg hover:shadow-2xl hover:border-violet-500/50 transition-all duration-500 overflow-hidden group relative h-[480px] w-full flex flex-col border border-gray-700/50">
                  {/* Card Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900/30"></div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-600/10 to-transparent rounded-full transform translate-x-12 -translate-y-12 group-hover:scale-150 transition-transform duration-700"></div>
                  
                  <CardContent className="p-6 relative flex-1 flex flex-col h-full">
                    {/* Friend Header */}
                    <div className="flex items-center justify-between mb-6 min-h-[80px]">
                      <div className="flex items-center gap-4">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Avatar className="h-14 w-14 ring-4 ring-gray-700 shadow-xl group-hover:ring-violet-500/50 transition-all duration-300">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${friend.name}`} />
                            <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white font-bold text-lg">
                              {friend.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-white group-hover:text-violet-400 transition-colors duration-300 truncate">
                            {friend.name}
                          </h3>
                          <Badge variant="outline" className="bg-violet-900/50 text-violet-300 border-violet-700 text-xs font-medium mt-1">
                            🤝 Friend
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="relative" ref={openDropdown === friend.id ? dropdownRef : null}>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setOpenDropdown(openDropdown === friend.id ? null : friend.id)}
                          className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-300" />
                        </motion.button>
                        
                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {openDropdown === friend.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute right-0 mt-3 w-64 bg-gray-800/95 backdrop-blur-lg rounded-xl shadow-2xl border border-gray-700/50 z-10 overflow-hidden"
                            >
                              <div className="py-2">
                                <motion.button
                                  onClick={() => openBalanceModal(friend)}
                                  whileHover={{ backgroundColor: "rgb(49, 46, 129)" }}
                                  className="w-full px-5 py-4 text-left flex items-center gap-3 transition-colors text-violet-400 hover:text-violet-300"
                                >
                                  <div className="bg-violet-900/50 p-2 rounded-lg">
                                    <Eye className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <span className="font-semibold">View Balance Details</span>
                                    <p className="text-xs text-violet-300">See all transactions</p>
                                  </div>
                                </motion.button>
                                
                                {getFriendBalance(friend.id).netBalance > 0 && (
                                  <motion.button
                                    onClick={() => sendReminder(friend)}
                                    disabled={sendingReminder}
                                    whileHover={{ backgroundColor: "rgb(69, 10, 10)" }}
                                    className="w-full px-5 py-4 text-left flex items-center gap-3 transition-colors text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <div className="bg-red-900/50 p-2 rounded-lg">
                                      {sendingReminder ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-400 border-t-transparent" />
                                      ) : (
                                        <Send className="h-4 w-4" />
                                      )}
                                    </div>
                                    <div>
                                      <span className="font-semibold">
                                        {sendingReminder ? 'Sending...' : 'Send Payment Reminder'}
                                      </span>
                                      <p className="text-xs text-red-300">Email notification</p>
                                    </div>
                                  </motion.button>
                                )}
                                
                                <div className="border-t border-gray-700/50 my-2"></div>
                                
                                <motion.button
                                  onClick={() => openRemoveDialog(friend)}
                                  whileHover={{ backgroundColor: "rgb(127, 29, 29)" }}
                                  className="w-full px-5 py-4 text-left flex items-center gap-3 transition-colors text-red-400 hover:text-red-300"
                                >
                                  <div className="bg-red-900/50 p-2 rounded-lg">
                                    <UserMinus className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <span className="font-semibold">Remove Friend</span>
                                    <p className="text-xs text-red-300">Permanent action</p>
                                  </div>
                                </motion.button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    
                    {/* Contact Info */}
                    <div className="space-y-3 mb-6 min-h-[100px]">
                      <motion.div 
                        className="flex items-center gap-3 text-gray-300 bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-lg p-3 border border-gray-600/50"
                        whileHover={{ scale: 1.02, backgroundColor: "rgb(75, 85, 99)" }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="bg-violet-900/50 p-2 rounded-lg flex-shrink-0">
                          <Mail className="h-4 w-4 text-violet-400" />
                        </div>
                        <span className="truncate font-medium text-sm">{friend.email}</span>
                      </motion.div>
                      {friend.phone ? (
                        <motion.div 
                          className="flex items-center gap-3 text-gray-300 bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-lg p-3 border border-gray-600/50"
                          whileHover={{ scale: 1.02, backgroundColor: "rgb(75, 85, 99)" }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="bg-emerald-900/50 p-2 rounded-lg flex-shrink-0">
                            <Phone className="h-4 w-4 text-emerald-400" />
                          </div>
                          <span className="font-medium text-sm">{friend.phone}</span>
                        </motion.div>
                      ) : (
                        <div className="h-[52px]"></div> // Placeholder to maintain uniform height
                      )}
                    </div>

                    {/* Balance Information */}
                    <div className="mb-6 flex-1 flex items-center min-h-[120px]">
                      {(() => {
                        const balance = getFriendBalance(friend.id);
                        const netBalance = balance.netBalance;
                        
                        if (netBalance === 0) {
                          return (
                            <motion.div 
                              className="bg-gradient-to-r from-gray-700/50 to-gray-600/50 border-2 border-gray-600/50 rounded-xl p-4 relative overflow-hidden w-full"
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="absolute top-0 right-0 w-12 h-12 bg-gray-600/30 rounded-full transform translate-x-6 -translate-y-6"></div>
                              <div className="flex items-center gap-3 relative">
                                <div className="bg-gray-600/50 p-2 rounded-full flex-shrink-0">
                                  <Minus className="h-5 w-5 text-gray-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-200 text-base">All settled up! 🎉</p>
                                  <p className="text-gray-400 text-sm">No outstanding balance</p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        } else if (netBalance > 0) {
                          return (
                            <motion.div 
                              className="bg-gradient-to-r from-emerald-900/50 to-green-900/50 border-2 border-emerald-600/50 rounded-xl p-4 relative overflow-hidden w-full"
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-600/20 rounded-full transform translate-x-8 -translate-y-8"></div>
                              <div className="flex items-center gap-3 relative">
                                <div className="bg-emerald-600/50 p-2 rounded-full flex-shrink-0">
                                  <TrendingUp className="h-5 w-5 text-emerald-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-emerald-200 text-sm">
                                    💰 {friend.name.split(' ')[0]} owes you
                                  </p>
                                  <p className="text-2xl font-black text-emerald-100">
                                    ${netBalance.toFixed(2)}
                                  </p>
                                </div>
                                <motion.button
                                  onClick={() => sendReminder(friend)}
                                  disabled={sendingReminder}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex-shrink-0"
                                  title="Send payment reminder"
                                >
                                  {sendingReminder ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                  ) : (
                                    <Bell className="h-4 w-4" />
                                  )}
                                </motion.button>
                              </div>
                            </motion.div>
                          );
                        } else {
                          return (
                            <motion.div 
                              className="bg-gradient-to-r from-red-900/50 to-rose-900/50 border-2 border-red-600/50 rounded-xl p-4 relative overflow-hidden w-full"
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/20 rounded-full transform translate-x-8 -translate-y-8"></div>
                              <div className="flex items-center gap-3 relative">
                                <div className="bg-red-600/50 p-2 rounded-full flex-shrink-0">
                                  <TrendingDown className="h-5 w-5 text-red-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-red-200 text-sm">
                                    📤 You owe {friend.name.split(' ')[0]}
                                  </p>
                                  <p className="text-2xl font-black text-red-100">
                                    ${Math.abs(netBalance).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        }
                      })()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-auto">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1"
                      >
                        <Button 
                          className="w-full h-10 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg font-semibold rounded-lg text-sm"
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
                          className="h-10 px-4 border-2 bg-gray-800 border-gray-600 hover:bg-gray-700/50 rounded-lg font-semibold text-gray-300 hover:text-white"
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
            className="bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-700/50 p-16 text-center relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 to-purple-900/20 rounded-3xl"></div>
            <div className="absolute top-0 left-0 w-32 h-32 bg-violet-600/20 rounded-full transform -translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-600/20 rounded-full transform translate-x-20 translate-y-20"></div>
            
            <motion.div 
              className="mb-8 relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
            >
              <div className="bg-gradient-to-br from-violet-900/50 to-purple-900/50 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="h-16 w-16 text-violet-400" />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="relative"
            >
              <h3 className="text-3xl font-bold text-gray-200 mb-4">
                {searchTerm ? '🔍 No friends found' : '👥 No friends yet'}
              </h3>
              <p className="text-gray-400 mb-10 max-w-md mx-auto text-lg leading-relaxed">
                {searchTerm 
                  ? 'Try adjusting your search terms or check the spelling.' 
                  : 'Start building your network by adding friends to split expenses together. Make sharing costs simple and fun!'
                }
              </p>
              
              {!searchTerm && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-10 py-4 text-lg shadow-xl rounded-xl font-bold"
                  >
                    <UserPlus className="h-6 w-6 mr-3" />
                    Add Your First Friend
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

      {/* Remove Friend Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="max-w-md bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-gray-100">
              <div className="bg-red-900/50 p-2 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              Remove Friend
            </DialogTitle>
            <DialogDescription className="text-left pt-2 text-gray-300">
              Are you sure you want to remove <strong className="text-gray-100">{friendToRemove?.name}</strong> from your friends list? 
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
              className="border-gray-600 hover:bg-gray-700/50 text-gray-300 hover:text-white"
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-800 border-gray-700">
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
    </div>
  );
}
