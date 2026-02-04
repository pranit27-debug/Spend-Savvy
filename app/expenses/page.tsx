'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import {
    Calendar,
    DollarSign,
    Eye,
    Plus,
    Receipt,
    Search,
    TrendingDown,
    TrendingUp,
    Users
} from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

// Dollar Animation Component
const DollarAnimation: React.FC<{ x: number; y: number; id: string }> = ({ x, y, id }) => (
  <motion.div
    key={id}
    initial={{ 
      opacity: 1, 
      scale: 1, 
      x: 0, 
      y: 0,
      rotate: 0 
    }}
    animate={{ 
      opacity: 0, 
      scale: 1.5, 
      x: x, 
      y: y,
      rotate: 720 
    }}
    transition={{ 
      duration: 2, 
      ease: "easeOut",
      delay: Math.random() * 0.3 
    }}
    className="absolute pointer-events-none text-3xl font-bold text-green-500 z-50"
    style={{ 
      left: '50%', 
      top: '50%',
      transform: 'translate(-50%, -50%)'
    }}
  >
    �
  </motion.div>
);

// Detailed Expense Modal Component
const ExpenseDetailModal: React.FC<{
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onPayExpense: (expenseId: string, splitUserId?: string) => void;
  payingExpenseId: string | null;
  getCategoryIcon: (category: string) => string;
  getCategoryColor: (category: string) => string;
}> = ({ 
  expense, 
  isOpen, 
  onClose, 
  currentUserId, 
  onPayExpense, 
  payingExpenseId,
  getCategoryIcon,
  getCategoryColor 
}) => {
  if (!expense) return null;

  const totalPaid = expense.splits.filter(split => split.paid).reduce((sum, split) => sum + split.amount, 0);
  const totalUnpaid = expense.total_amount - totalPaid;
  const userSplit = expense.splits.find(split => split.user_id === currentUserId);

  return (
    
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="bg-slate-100 p-2 rounded-full">
              <span className="text-2xl">{getCategoryIcon(expense.category)}</span>
            </div>
            {expense.description}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Expense Overview */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">${expense.total_amount.toFixed(2)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Your Share</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">${(userSplit?.amount || 0).toFixed(2)}</p>
                {userSplit && (
                  <Badge className={userSplit.paid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                    {userSplit.paid ? "✓ Paid" : "Pending"}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expense Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expense Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Category</span>
                <div className="flex gap-2">
                  <Badge className={getCategoryColor(expense.category)}>
                    {expense.category}
                  </Badge>
                  {expense.subcategory && (
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                      {expense.subcategory}
                    </Badge>
                  )}
                </div>
              </div>
              {expense.group_name && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Group</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    📱 {expense.group_name}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Date</span>
                <span className="font-medium">{new Date(expense.created_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Created by</span>
                <span className="font-medium">{expense.created_by === currentUserId ? 'You' : expense.created_by}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Split between</span>
                <span className="font-medium">{expense.splits.length} people</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Paid</span>
                  <span className="font-medium text-green-600">${totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Remaining</span>
                  <span className="font-medium text-amber-600">${totalUnpaid.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(totalPaid / expense.total_amount) * 100}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          {/* Split Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Split Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expense.splits.map((split, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-r from-blue-400 to-purple-400 text-white font-medium">
                          {split.user_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{split.user_id === currentUserId ? 'You' : split.user_name}</p>
                        <p className="text-sm text-slate-500">${split.amount.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {split.paid ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          ✓ Paid
                        </Badge>
                      ) : split.user_id === currentUserId ? (
                        <Button
                          onClick={() => onPayExpense(expense.id, split.user_id)}
                          disabled={payingExpenseId === expense.id}
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        >
                          {payingExpenseId === expense.id ? "Paying..." : "Pay Now"}
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all duration-200">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface Expense {
  id: string;
  description: string;
  amount: number;
  total_amount: number; // Add total amount
  category: string;
  subcategory?: string; // Add subcategory
  created_at: string;
  user_amount: number;
  created_by: string;
  group_id?: string; // Add group ID
  group_name?: string; // Add group name
  paid: boolean; // Add payment status
  splits: {
    user_id: string;
    user_name: string;
    amount: number;
    paid: boolean; // Add payment status for each split
  }[];
}

interface Balance {
  userId: string;
  userName: string;
  owesYou: number;
  youOwe: number;
  netBalance: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('recent');
  const [sortBy, setSortBy] = useState('date');
  const [payingExpenseId, setPayingExpenseId] = useState<string | null>(null);
  const [dollarAnimations, setDollarAnimations] = useState<{ id: string; x: number; y: number }[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    // Get the actual logged-in user data from localStorage
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      console.log('Raw user data from localStorage:', userData);
      if (userData) {
        const user = JSON.parse(userData);
        console.log('Parsed user data:', user);
        console.log('Setting userId to:', user.id);
        setUserId(user.id);
        setCurrentUser({
          email: user.email,
          name: user.name
        });
      } else {
        console.log('No user data found in localStorage');
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadExpenses();
      loadBalances();
    }
  }, [userId, timeFilter, categoryFilter]);

  const loadExpenses = async () => {
    try {
      console.log('Loading expenses for userId:', userId);
      const params = new URLSearchParams({
        userId,
        timeframe: timeFilter,
        limit: '50'
      });
      
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }

      const url = `/api/expenses/history?${params}`;
      console.log('Fetching expenses from:', url);
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Expenses API response:', data);
      
      if (data.success) {
        console.log('Setting expenses:', data.expenses);
        setExpenses(data.expenses);
      } else {
        console.error('Failed to load expenses:', data.error);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  const loadBalances = async () => {
    try {
      const response = await fetch(`/api/balances?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setBalances(data.balances);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayExpense = async (expenseId: string, splitUserId?: string) => {
    setPayingExpenseId(expenseId);
    
    try {
      // Trigger dollar animation with better positioning
      const randomDollars = Array.from({ length: 8 }, (_, i) => ({
        id: `${expenseId}-${i}-${Date.now()}`,
        x: (Math.random() - 0.5) * 400, // Wider spread
        y: (Math.random() - 0.5) * 300  // Taller spread
      }));
      setDollarAnimations(randomDollars);

      // Make API call to update payment status in database
      const response = await fetch(`/api/expenses/${expenseId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, splitUserId })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update payment status');
      }

      console.log('Payment successful, refreshing expenses and balances...');

      // Reload both expenses and balances to reflect the payment
      await Promise.all([
        loadExpenses(),
        loadBalances()
      ]);

      // Clear animations after 3 seconds
      setTimeout(() => {
        setDollarAnimations([]);
        setPayingExpenseId(null);
      }, 3000);

    } catch (error) {
      console.error('Error paying expense:', error);
      setPayingExpenseId(null);
      setDollarAnimations([]);
      
      // Show error message to user
      alert('Failed to process payment. Please try again.');
    }
  };

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleCloseExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setSelectedExpense(null);
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    switch (sortBy) {
      case 'amount':
        return b.amount - a.amount;
      case 'category':
        return a.category.localeCompare(b.category);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExpenses = sortedExpenses.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.user_amount, 0);
  const totalOwed = balances.reduce((sum, balance) => sum + balance.owesYou, 0);
  const totalOwe = balances.reduce((sum, balance) => sum + balance.youOwe, 0);

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
      food: 'bg-orange-100 text-orange-800 pointer-events-none',
      transport: 'bg-blue-100 text-blue-800 pointer-events-none',
      entertainment: 'bg-purple-100 text-purple-800 pointer-events-none',
      shopping: 'bg-pink-100 text-pink-800 pointer-events-none',
      utilities: 'bg-yellow-100 text-yellow-800 pointer-events-none',
      travel: 'bg-green-100 text-green-800 pointer-events-none',
      healthcare: 'bg-red-100 text-red-800 pointer-events-none',
      education: 'bg-indigo-100 text-indigo-800 pointer-events-none',
      default: 'bg-gray-100 text-gray-800 pointer-events-none'
    };
    return colors[category] || colors.default;
  };

  // Check if user is logged in
  if (!userId && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-400/20 to-pink-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center relative z-10 bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl"
        >
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-4"
          >
            Please Log In
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-600 mb-6"
          >
            You need to be logged in to view your expenses.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link href="/signin">
              <Button className="bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 hover:from-violet-600 hover:via-purple-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-200 shadow-lg">
                Go to Sign In
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-400/20 to-pink-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center relative z-10 bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-4 border-violet-200 border-t-violet-600 mx-auto mb-4"
          ></motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-600 text-lg"
          >
            Loading your expenses...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-4 md:p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-violet-600/20 to-purple-700/20 rounded-full mix-blend-lighten filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-600/20 to-cyan-700/20 rounded-full mix-blend-lighten filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-indigo-600/20 to-blue-700/20 rounded-full mix-blend-lighten filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      {/* Global Dollar Animation Container */}
      {dollarAnimations.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          {dollarAnimations.map((dollar) => (
            <DollarAnimation
              key={dollar.id}
              x={dollar.x}
              y={dollar.y}
              id={dollar.id}
            />
          ))}
        </div>
      )}
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between mb-8"
        >
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2"
            >
              Your Expenses
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 text-lg"
            >
              Track, split, and manage your expenses with friends ✨
            </motion.p>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3 mt-4 md:mt-0"
          >
            <Link href="/expenses/add">
              <Button className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 hover:from-violet-700 hover:via-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="bg-gray-800/80 backdrop-blur-lg shadow-xl border border-gray-700/50 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">You Owe</p>
                    <motion.p 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent"
                    >
                      ${totalOwe.toFixed(2)}
                    </motion.p>
                  </div>
                  <motion.div 
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-red-500 to-pink-600 p-3 rounded-xl shadow-lg"
                  >
                    <TrendingUp className="w-6 h-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="bg-gray-800/80 backdrop-blur-lg shadow-xl border border-gray-700/50 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Owed to You</p>
                    <motion.p 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent"
                    >
                      ${totalOwed.toFixed(2)}
                    </motion.p>
                  </div>
                  <motion.div 
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-emerald-500 to-green-600 p-3 rounded-xl shadow-lg"
                  >
                    <TrendingDown className="w-6 h-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="bg-gray-800/80 backdrop-blur-lg shadow-xl border border-gray-700/50 overflow-hidden relative group">
              <div className={`absolute inset-0 ${(totalOwed - totalOwe) >= 0 ? 'bg-gradient-to-br from-blue-600/10 to-cyan-600/10' : 'bg-gradient-to-br from-orange-600/10 to-red-600/10'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Net Balance</p>
                    <motion.p 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className={`text-2xl font-bold ${(totalOwed - totalOwe) >= 0 ? 'bg-gradient-to-r from-blue-400 to-cyan-400' : 'bg-gradient-to-r from-orange-400 to-red-400'} bg-clip-text text-transparent`}
                    >
                      ${(totalOwed - totalOwe).toFixed(2)}
                    </motion.p>
                  </div>
                  <motion.div 
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className={`${(totalOwed - totalOwe) >= 0 ? 'bg-gradient-to-br from-blue-500 to-cyan-600' : 'bg-gradient-to-br from-orange-500 to-red-600'} p-3 rounded-xl shadow-lg`}
                  >
                    <DollarSign className="w-6 h-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="bg-gray-800/80 backdrop-blur-lg shadow-xl border border-gray-700/50 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Expenses</p>
                    <motion.p 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent"
                    >
                      {expenses.length}
                    </motion.p>
                  </div>
                  <motion.div 
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl shadow-lg"
                  >
                    <Receipt className="w-6 h-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-700/50 p-6 mb-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 via-purple-600/5 to-blue-600/5"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <Label htmlFor="search" className="text-gray-300 font-medium">Search Expenses</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search descriptions..."
                  className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <Label className="text-gray-300 font-medium">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-gray-700/50 border-gray-600 text-gray-100 focus:border-violet-500 focus:ring-violet-500/20 [&>span]:text-gray-100">
                  <SelectValue placeholder="Select category" className="text-gray-100" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                  <SelectItem value="all" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">All Categories</SelectItem>
                  <SelectItem value="food" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">🍽️ Food & Dining</SelectItem>
                  <SelectItem value="transport" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">🚗 Transport</SelectItem>
                  <SelectItem value="entertainment" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">🎬 Entertainment</SelectItem>
                  <SelectItem value="shopping" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">🛒 Shopping</SelectItem>
                  <SelectItem value="utilities" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">⚡ Utilities</SelectItem>
                  <SelectItem value="travel" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">✈️ Travel</SelectItem>
                  <SelectItem value="healthcare" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">🏥 Healthcare</SelectItem>
                  <SelectItem value="education" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">📚 Education</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <Label className="text-gray-300 font-medium">Time Period</Label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="bg-gray-700/50 border-gray-600 text-gray-100 focus:border-violet-500 focus:ring-violet-500/20 [&>span]:text-gray-100">
                  <SelectValue placeholder="Select time period" className="text-gray-100" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                  <SelectItem value="recent" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">All Time</SelectItem>
                  <SelectItem value="today" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">Today</SelectItem>
                  <SelectItem value="this_week" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">This Week</SelectItem>
                  <SelectItem value="this_month" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">This Month</SelectItem>
                  <SelectItem value="last_month" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-2"
            >
              <Label className="text-gray-300 font-medium">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-gray-700/50 border-gray-600 text-gray-100 focus:border-violet-500 focus:ring-violet-500/20 [&>span]:text-gray-100">
                  <SelectValue placeholder="Select sort option" className="text-gray-100" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                  <SelectItem value="date" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">Date</SelectItem>
                  <SelectItem value="amount" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">Amount</SelectItem>
                  <SelectItem value="category" className="text-gray-100 hover:bg-white hover:text-gray-900 focus:bg-white focus:text-gray-900">Category</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          </div>
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex justify-center items-center gap-2 mb-6"
          >
            <div className="text-sm text-gray-400 mr-4">
              Showing {startIndex + 1}-{Math.min(endIndex, sortedExpenses.length)} of {sortedExpenses.length} expenses
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <motion.button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-10 h-10 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-blue-800 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {page}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Expenses List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {sortedExpenses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-gray-800/90 backdrop-blur-lg shadow-xl border border-gray-700/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-purple-600/5 to-blue-600/5"></div>
                <CardContent className="p-12 text-center relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  >
                    <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  </motion.div>
                  <motion.h3 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-xl font-semibold bg-gradient-to-r from-gray-200 to-white bg-clip-text text-transparent mb-2"
                  >
                    No expenses found
                  </motion.h3>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="text-gray-400 mb-6"
                  >
                    {searchTerm || categoryFilter !== 'all' 
                      ? 'Try adjusting your filters or search terms'
                      : 'Start by adding your first expense'
                    }
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Link href="/expenses/add">
                      <Button className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 hover:from-violet-700 hover:via-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Expense
                      </Button>
                    </Link>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            paginatedExpenses.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.01, y: -2 }}
                className="transform transition-all duration-200"
              >
                <Card className="bg-gray-800/90 backdrop-blur-lg shadow-xl border border-gray-700/50 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 via-purple-600/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <motion.div 
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="bg-gradient-to-br from-gray-700 to-gray-800 p-3 rounded-2xl shadow-md"
                        >
                          <span className="text-2xl">{getCategoryIcon(expense.category)}</span>
                        </motion.div>
                        
                        <div className="flex-1">
                          <motion.h3 
                            className="font-semibold bg-gradient-to-r from-gray-100 to-white bg-clip-text text-transparent mb-1"
                            whileHover={{ scale: 1.02 }}
                          >
                            {expense.description}
                          </motion.h3>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <Badge className={`${getCategoryColor(expense.category)} transition-all duration-200`}>
                              {expense.category}
                            </Badge>
                            {expense.subcategory && (
                              <Badge variant="outline" className="bg-gray-700/50 text-gray-300 border-gray-600 transition-all duration-200">
                                {expense.subcategory}
                              </Badge>
                            )}
                            {expense.group_name && (
                              <Badge variant="outline" className="bg-blue-900/50 text-blue-300 border-blue-700 transition-all duration-200">
                                📱 {expense.group_name}
                              </Badge>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(expense.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {expense.splits.length} people
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {expense.user_amount > 0 ? (
                          <>
                            <p className="text-sm text-gray-400 mb-1">Your share</p>
                            <motion.p 
                              className="text-2xl font-bold bg-gradient-to-r from-gray-100 to-white bg-clip-text text-transparent"
                              whileHover={{ scale: 1.05 }}
                            >
                              ${expense.user_amount.toFixed(2)}
                            </motion.p>
                            <p className="text-sm text-gray-500">
                              of ${expense.total_amount.toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-400 mb-1">You created</p>
                            <motion.p 
                              className="text-2xl font-bold bg-gradient-to-r from-gray-100 to-white bg-clip-text text-transparent"
                              whileHover={{ scale: 1.05 }}
                            >
                              ${expense.total_amount.toFixed(2)}
                            </motion.p>
                            <p className="text-sm text-gray-500">
                              Total expense
                            </p>
                          </>
                        )}
                      </div>

                      <div className="ml-4 flex items-center gap-2">
                        {/* Payment Status - only show if user has an amount to pay */}
                        {expense.user_amount > 0 && (
                          expense.paid ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-800 hover:text-green-100 hover:border-green-600 transition-all duration-200">
                              ✓ Paid
                            </Badge>
                          ) : (
                            <div className="relative">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  onClick={() => handlePayExpense(expense.id)}
                                  disabled={payingExpenseId === expense.id}
                                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform transition-all duration-200"
                                  size="sm"
                                >
                                  {payingExpenseId === expense.id ? (
                                    <div className="flex items-center gap-2">
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                      Paying...
                                    </div>
                                  ) : (
                                    <>
                                      <DollarSign className="w-4 h-4 mr-1" />
                                      Pay
                                    </>
                                  )}
                                </Button>
                              </motion.div>
                            </div>
                          )
                        )}
                        
                        {expense.user_amount === 0 && (
                          <Badge className="bg-blue-900/50 text-blue-300 border-blue-700 transition-all duration-200">
                            Creator
                          </Badge>
                        )}
                        
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-full bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gradient-to-r hover:from-violet-700/50 hover:to-purple-700/50 transition-all duration-200"
                            onClick={() => handleViewExpense(expense)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      </div>
                    </div>

                    {/* Participants Preview */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mt-4 pt-4 border-t border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-300 font-medium">Split with:</span>
                          <motion.div 
                            className="flex -space-x-2"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            {expense.splits.slice(0, 4).map((split, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 + idx * 0.1 }}
                                whileHover={{ scale: 1.1, zIndex: 10 }}
                              >
                                <Avatar className="w-8 h-8 border-2 border-white shadow-md">
                                  <AvatarFallback className="text-xs bg-gradient-to-r from-violet-400 to-purple-400 text-white">
                                    {split.user_name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                            ))}
                            {expense.splits.length > 4 && (
                              <motion.div 
                                className="w-8 h-8 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 border-2 border-white flex items-center justify-center text-xs text-slate-600 shadow-md"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.8 }}
                                whileHover={{ scale: 1.1 }}
                              >
                                +{expense.splits.length - 4}
                              </motion.div>
                            )}
                          </motion.div>
                        </div>
                        
                        <Badge variant="outline" className="text-xs text-white border-purple-400 hover:bg-purple-500 hover:text-white hover:scale-105 transition-all duration-200">
                          {expense.created_by === userId ? 'You paid' : 'Split expense'}
                        </Badge>
                      </div>

                      {/* Individual Split Status */}
                      <div className="space-y-2">
                        {expense.splits.map((split, idx) => (
                          <motion.div 
                            key={idx} 
                            className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-700/30 transition-all duration-200"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + idx * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                          >
                            <div className="flex items-center gap-2">
                              <motion.div whileHover={{ scale: 1.1 }}>
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-xs bg-gradient-to-r from-violet-400 to-purple-400 text-white">
                                    {split.user_name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                              <span className="text-gray-300 font-medium">{split.user_name}</span>
                              <span className="text-gray-400">${split.amount.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {split.paid ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs hover:bg-green-800 hover:text-green-100 hover:border-green-600 transition-all duration-200">
                                  ✓ Paid
                                </Badge>
                              ) : split.user_id === userId ? (
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    onClick={() => handlePayExpense(expense.id, split.user_id)}
                                    disabled={payingExpenseId === expense.id}
                                    size="sm"
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs px-2 py-1 h-6"
                                  >
                                    Pay
                                  </Button>
                                </motion.div>
                              ) : (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all duration-200">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Global Dollar Animation Container */}
        {dollarAnimations.length > 0 && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {dollarAnimations.map((dollar) => (
              <DollarAnimation
                key={dollar.id}
                x={dollar.x}
                y={dollar.y}
                id={dollar.id}
              />
            ))}
          </div>
        )}

        {/* Expense Detail Modal */}
        <ExpenseDetailModal
          expense={selectedExpense}
          isOpen={isExpenseModalOpen}
          onClose={handleCloseExpenseModal}
          currentUserId={userId}
          onPayExpense={handlePayExpense}
          payingExpenseId={payingExpenseId}
          getCategoryIcon={getCategoryIcon}
          getCategoryColor={getCategoryColor}
        />
      </div>
    </div>
  );
}
