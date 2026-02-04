'use client';

import GroupChatSection from '@/components/groups/GroupChatSection';
import GroupExpenseDialog from '@/components/groups/GroupExpenseDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    ChevronRight,
    Clock,
    Crown,
    Eye,
    MessageCircle,
    Plus,
    Receipt,
    TrendingUp,
    Users
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface GroupMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  joined_at: string;
}

interface GroupExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  splits: {
    user_id: string;
    user_name: string;
    amount: number;
    paid: boolean;
  }[];
}

interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  members: GroupMember[];
  memberCount: number;
  totalExpenses: number;
}

const tabConfig = [
  {
    id: 'expenses',
    label: 'Expenses',
    icon: Receipt,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'from-blue-50 to-indigo-50',
    description: 'Track and manage group expenses'
  },
  {
    id: 'members',
    label: 'Members',
    icon: Users,
    color: 'from-purple-500 to-violet-600',
    bgColor: 'from-purple-50 to-violet-50',
    description: 'View and manage group members'
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: MessageCircle,
    color: 'from-green-500 to-emerald-600',
    bgColor: 'from-green-50 to-emerald-50',
    description: 'Group conversation and updates'
  }
];

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.id);
        loadGroupData(groupId, user.id);
      }
    }
  }, [groupId]);

  const loadGroupData = async (groupId: string, currentUserId: string) => {
    try {
      setIsLoading(true);
      
      // Load group details
      const groupResponse = await fetch(`/api/groups/${groupId}?userId=${currentUserId}`);
      const groupData = await groupResponse.json();
      
      if (groupData.success) {
        setGroup(groupData.group);
      }

      // Load group expenses
      const expensesResponse = await fetch(`/api/groups/${groupId}/expenses?userId=${currentUserId}`);
      const expensesData = await expensesResponse.json();
      
      if (expensesData.success) {
        setExpenses(expensesData.expenses || []);
      }
      
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExpense = async (expenseData: any) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...expenseData,
          createdBy: userId,
          groupId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh expenses
        const expensesResponse = await fetch(`/api/groups/${groupId}/expenses?userId=${userId}`);
        const expensesData = await expensesResponse.json();
        
        if (expensesData.success) {
          setExpenses(expensesData.expenses || []);
        }
      } else {
        throw new Error(data.error || 'Failed to create expense');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      food: '🍽️',
      transport: '🚗',
      entertainment: '🎬',
      shopping: '🛒',
      utilities: '⚡',
      travel: '✈️',
      healthcare: '🏥',
      education: '📚',
      default: '📋'
    };
    return icons[category] || icons.default;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      food: 'bg-gradient-to-r from-orange-900/30 to-orange-800/30 text-orange-300 border-orange-700/50 pointer-events-none',
      transport: 'bg-gradient-to-r from-blue-900/30 to-blue-800/30 text-blue-300 border-blue-700/50 pointer-events-none',
      entertainment: 'bg-gradient-to-r from-purple-900/30 to-purple-800/30 text-purple-300 border-purple-700/50 pointer-events-none',
      shopping: 'bg-gradient-to-r from-pink-900/30 to-pink-800/30 text-pink-300 border-pink-700/50 pointer-events-none',
      utilities: 'bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 text-yellow-300 border-yellow-700/50 pointer-events-none',
      travel: 'bg-gradient-to-r from-green-900/30 to-green-800/30 text-green-300 border-green-700/50 pointer-events-none',
      healthcare: 'bg-gradient-to-r from-red-900/30 to-red-800/30 text-red-300 border-red-700/50 pointer-events-none',
      education: 'bg-gradient-to-r from-indigo-900/30 to-indigo-800/30 text-indigo-300 border-indigo-700/50 pointer-events-none',
      default: 'bg-gradient-to-r from-gray-800/30 to-gray-700/30 text-gray-300 border-gray-600/50 pointer-events-none'
    };
    return colors[category] || colors.default;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getTabStats = (tabId: string) => {
    switch (tabId) {
      case 'expenses':
        return { count: expenses.length, label: expenses.length === 1 ? 'expense' : 'expenses' };
      case 'members':
        return { count: group?.memberCount || 0, label: group?.memberCount === 1 ? 'member' : 'members' };
      case 'chat':
        return { count: 0, label: 'messages' }; // This would come from chat API
      default:
        return { count: 0, label: '' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative mb-6">
            <div className="animate-spin h-16 w-16 border-4 border-transparent bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"></div>
            <div className="animate-spin  h-16 w-16 border-4 border-transparent bg-gradient-to-r from-violet-500 to-purple-500 rounded-full absolute top-0 left-0" style={{ animationDirection: 'reverse' }}></div>
            <div className="absolute inset-2 bg-gray-800 rounded-full shadow-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-violet-400" />
            </div>
          </div>
          <p className="text-gray-300 font-medium">Loading group details...</p>
        </motion.div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="bg-gray-800/80 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-gray-700/50">
            <div className="w-16 h-16 bg-gradient-to-r from-red-600/20 to-red-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Users className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-100 mb-2">Group not found</h2>
            <p className="text-gray-400 mb-6">This group may have been deleted or you don't have access.</p>
            <Button onClick={() => router.push('/groups')} variant="outline" className="rounded-full bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Groups
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4 mb-6 lg:mb-0">
            <Button
              variant="outline"
              onClick={() => router.push('/groups')}
              className="rounded-full h-12 w-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-100 flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="text-white w-6 h-6" />
                </div>
                {group.name}
              </h1>
              <div className="flex items-center gap-4 text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {group.memberCount} members
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Created {formatTimeAgo(group.created_at)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => setIsExpenseDialogOpen(true)}
              className="rounded-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300 px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Split Expense
            </Button>
          </div>
        </motion.div>

        {/* Enhanced Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card className="bg-gray-800/80 backdrop-blur-md shadow-xl border border-gray-700/50 hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 group-hover:from-violet-500/10 group-hover:to-purple-500/10 transition-all duration-300"></div>
            <CardContent className="p-6 text-center relative">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-100 mb-1">{group.memberCount}</h3>
              <p className="text-gray-400 font-medium">Active Members</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800/80 backdrop-blur-md shadow-xl border border-gray-700/50 hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 group-hover:from-green-500/10 group-hover:to-emerald-500/10 transition-all duration-300"></div>
            <CardContent className="p-6 text-center relative">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Receipt className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-100 mb-1">{expenses.length}</h3>
              <p className="text-gray-400 font-medium">Total Expenses</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800/80 backdrop-blur-md shadow-xl border border-gray-700/50 hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 group-hover:from-emerald-500/10 group-hover:to-teal-500/10 transition-all duration-300"></div>
            <CardContent className="p-6 text-center relative">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-100 mb-1">${group.totalExpenses.toFixed(2)}</h3>
              <p className="text-gray-400 font-medium">Amount Spent</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* Custom Tab Navigation */}
            <div className="relative">
              <div className="bg-gray-800/80 backdrop-blur-xl shadow-2xl border border-gray-700/50 rounded-3xl p-2 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {tabConfig.map((tab) => {
                    const Icon = tab.icon;
                    const stats = getTabStats(tab.id);
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <motion.button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative p-6 rounded-2xl transition-all duration-300 text-left group ${
                          isActive
                            ? 'bg-gradient-to-br from-gray-700 to-gray-600 shadow-xl scale-[1.02]'
                            : 'hover:bg-gray-700/50 hover:shadow-lg'
                        }`}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className={`absolute inset-0 bg-gradient-to-br ${tab.bgColor} rounded-2xl`}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-3">
                            <div className={`p-3 rounded-xl ${isActive ? `bg-gradient-to-br ${tab.color}` : 'bg-gray-600'} transition-all duration-300 group-hover:scale-110`}>
                              <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-300'}`} />
                            </div>
                            <ChevronRight className={`w-5 h-5 transition-all duration-300 ${
                              isActive ? 'text-gray-300 rotate-90' : 'text-gray-500 group-hover:text-gray-300'
                            }`} />
                          </div>
                          
                          <div className="space-y-2">
                            <h3 className={`text-xl font-bold transition-colors duration-300 ${
                              isActive ? 'text-gray-100' : 'text-gray-300 group-hover:text-gray-100'
                            }`}>
                              {tab.label}
                            </h3>
                            
                            <p className={`text-sm transition-colors duration-300 ${
                              isActive ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {tab.description}
                            </p>
                            
                            <div className="flex items-center gap-2 pt-2">
                              <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                                isActive 
                                  ? 'bg-gray-600/60 text-gray-200 shadow-sm' 
                                  : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600/60'
                              }`}>
                                <span className="font-bold">{stats.count}</span>
                                <span>{stats.label}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <TabsContent value="expenses" className="space-y-6 mt-0">
                  {expenses.length === 0 ? (
                    <Card className="bg-gray-800/80 backdrop-blur-md shadow-xl border border-gray-700/50">
                      <CardContent className="p-12 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                          <Receipt className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-100 mb-3">No expenses yet</h3>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">Start tracking your group expenses by splitting your first bill or purchase</p>
                        <Button 
                          onClick={() => setIsExpenseDialogOpen(true)}
                          className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Split Your First Expense
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {expenses.map((expense, index) => (
                        <motion.div
                          key={expense.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index }}
                          whileHover={{ y: -2 }}
                        >
                          <Card className="bg-gray-800/80 backdrop-blur-md shadow-xl border border-gray-700/50 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center shadow-sm">
                                    <span className="text-3xl">{getCategoryIcon(expense.category)}</span>
                                  </div>
                                  
                                  <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-100 mb-2">
                                      {expense.description}
                                    </h3>
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <Badge className={`${getCategoryColor(expense.category)} border font-medium px-3 py-1 rounded-full`}>
                                        {expense.category}
                                      </Badge>
                                      <span className="flex items-center gap-1 text-sm text-gray-400">
                                        <Calendar className="w-4 h-4" />
                                        {formatTimeAgo(expense.created_at)}
                                      </span>
                                      <span className="text-sm text-gray-400">by {expense.created_by_name}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="text-3xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                                    ${expense.amount.toFixed(2)}
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    Split between {expense.splits.length} people
                                  </p>
                                </div>
                              </div>

                              {/* Enhanced Splits Preview */}
                              <div className="bg-gradient-to-r from-gray-700 to-gray-600/50 rounded-2xl p-4 border border-gray-600">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-gray-200">Split Details</h4>
                                  <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0 hover:bg-gray-600">
                                    <Eye className="w-4 h-4 text-gray-300" />
                                  </Button>
                                </div>
                                
                                <div className="space-y-3">
                                  {expense.splits.slice(0, 3).map((split, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8 shadow-sm">
                                          <AvatarFallback className="text-xs bg-gradient-to-br from-violet-400 to-purple-500 text-white font-medium">
                                            {split.user_name.split(' ').map(n => n[0]).join('')}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <span className="font-medium text-gray-200">{split.user_name}</span>
                                          <p className="text-sm text-gray-400">${split.amount.toFixed(2)}</p>
                                        </div>
                                      </div>
                                      
                                      <Badge className={split.paid 
                                        ? "bg-gradient-to-r from-green-800/50 to-emerald-700/50 text-green-300 border-green-600" 
                                        : "bg-gradient-to-r from-amber-800/50 to-orange-700/50 text-amber-300 border-amber-600"
                                      }>
                                        {split.paid ? "✓ Paid" : "Pending"}
                                      </Badge>
                                    </div>
                                  ))}
                                  {expense.splits.length > 3 && (
                                    <div className="text-center pt-2">
                                      <span className="text-xs text-gray-400 bg-gray-700 px-3 py-1 rounded-full">
                                        +{expense.splits.length - 3} more people
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="members" className="space-y-6 mt-0">
                  <Card className="bg-gray-800/80 backdrop-blur-md shadow-xl border border-gray-700/50">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-2 text-xl text-gray-100">
                        <Users className="w-5 h-5 text-violet-400" />
                        Group Members
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {group.members.map((member, index) => (
                        <motion.div 
                          key={member.user_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-gray-700/50 to-gray-600/30 border border-gray-600 hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12 shadow-lg">
                              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white font-semibold text-sm">
                                {member.user_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-gray-100 text-lg">{member.user_name}</p>
                              <p className="text-sm text-gray-400">{member.user_email}</p>
                              <p className="text-xs text-gray-500">Joined {formatTimeAgo(member.joined_at)}</p>
                            </div>
                          </div>
                          
                          <Badge 
                            variant="outline" 
                            className={member.user_id === group.created_by 
                              ? "bg-gradient-to-r from-amber-900/30 to-yellow-800/30 text-amber-300 border-amber-700/50" 
                              : "bg-gray-700/50 text-gray-300 border-gray-600"
                            }
                          >
                            {member.user_id === group.created_by && <Crown className="w-3 h-3 mr-1" />}
                            {member.user_id === group.created_by ? 'Admin' : 'Member'}
                          </Badge>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="chat" className="mt-0">
                  <GroupChatSection groupId={groupId} currentUserId={userId} />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </div>

      {/* Group Expense Dialog */}
      <GroupExpenseDialog
        isOpen={isExpenseDialogOpen}
        onClose={() => setIsExpenseDialogOpen(false)}
        onCreateExpense={handleCreateExpense}
        groupMembers={group.members}
        currentUserId={userId}
      />
    </div>
  );
}