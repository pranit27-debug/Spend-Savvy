'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

interface BalanceSummary {
  totalOwedToYou: number;
  totalYouOwe: number;
  netBalance: number;
  friendCount: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'owes_you' | 'you_owe'>('all');
  const [userPages, setUserPages] = useState<{[userId: string]: number}>({});
  const router = useRouter();

  const ITEMS_PER_PAGE = 3;

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
      fetchBalances(parsedUser.id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/signin');
    }
  }, [router]);

  const fetchBalances = async (userId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/balances?userId=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBalances(data.balances);
          setSummary(data.summary);
        }
      } else {
        console.error('Failed to fetch balances:', response.status);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBalances = balances.filter(balance => {
    if (selectedFilter === 'owes_you') return balance.owesYou > 0;
    if (selectedFilter === 'you_owe') return balance.youOwe > 0;
    return true;
  });

  // Pagination helper functions
  const getCurrentPage = (userId: string) => userPages[userId] || 1;
  
  const getTotalPages = (expenses: any[]) => Math.ceil(expenses.length / ITEMS_PER_PAGE);
  
  const getPaginatedExpenses = (expenses: any[], userId: string) => {
    const currentPage = getCurrentPage(userId);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return expenses.slice(startIndex, endIndex);
  };
  
  const setCurrentPage = (userId: string, page: number) => {
    setUserPages(prev => ({
      ...prev,
      [userId]: page
    }));
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/signin');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-violet-500 mx-auto mb-4"></div>
          <p className="text-gray-300 font-medium text-lg">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full mix-blend-lighten filter blur-xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-3/4 right-1/3 w-80 h-80 bg-purple-600/20 rounded-full mix-blend-lighten filter blur-xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-6 relative z-10">
        {/* Header */}
       <div className="flex items-center gap-3 mb-4">
            <div className='mb-4'>

            {/* <Brain className="w-8 h-8 text-violet-400" /> */}
            <h1 className="text-3xl  md:text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Notifications
            </h1>
            </div>
          </div>
        {/* <div className="flex justify-between items-center mb-6 bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-4">
            <Link
              href="/chat"
              className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700/50 rounded-xl transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">🔔</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Money Balances
                </h1>
                <span className="text-sm text-gray-400 font-medium">All your financial notifications</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link 
              href="/friends" 
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-5 py-2.5 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              👥 Manage Friends
            </Link>
            <Link 
              href="/expenses" 
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-2.5 rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              📊 View Expenses
            </Link>
            <button
              onClick={handleSignOut}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2.5 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              🚪 Sign Out
            </button>
          </div>
        </div> */}

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Owed to You */}
            <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Owed to You</p>
                  <p className="text-3xl font-bold">${summary.totalOwedToYou.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">💚</span>
                </div>
              </div>
            </div>

            {/* Total You Owe */}
            <div className="bg-gradient-to-r from-red-400 to-red-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">You Owe</p>
                  <p className="text-3xl font-bold">${summary.totalYouOwe.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">💸</span>
                </div>
              </div>
            </div>

            {/* Net Balance */}
            <div className={`bg-gradient-to-r ${summary.netBalance >= 0 ? 'from-blue-400 to-blue-600' : 'from-orange-400 to-orange-600'} rounded-2xl p-6 text-white shadow-xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Net Balance</p>
                  <p className="text-3xl font-bold">
                    {summary.netBalance >= 0 ? '+' : ''}${summary.netBalance.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">{summary.netBalance >= 0 ? '🎉' : '⚖️'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
              selectedFilter === 'all'
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
            }`}
          >
            🔄 All Balances
          </button>
          <button
            onClick={() => setSelectedFilter('owes_you')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
              selectedFilter === 'owes_you'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg'
                : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
            }`}
          >
            💚 Owes You
          </button>
          <button
            onClick={() => setSelectedFilter('you_owe')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
              selectedFilter === 'you_owe'
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-600'
            }`}
          >
            💸 You Owe
          </button>
        </div>

        {/* Balances List */}
        <div className="space-y-6">
          {filteredBalances.length > 0 ? (
            filteredBalances.map((balance) => (
              <div key={balance.userId} className="bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-700/50 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900/30"></div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-600/10 to-transparent rounded-full transform translate-x-12 -translate-y-12 group-hover:scale-150 transition-transform duration-700"></div>
                
                {/* Balance Header */}
                <div className="flex items-center justify-between mb-6 relative">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-violet-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-2xl">
                        {balance.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-100">{balance.userName}</h3>
                      <p className="text-gray-400">{balance.expenses.length} transaction{balance.expenses.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${balance.netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {balance.netBalance >= 0 ? '+' : ''}${Math.abs(balance.netBalance).toFixed(2)}
                    </div>
                    <p className="text-gray-400 text-sm">
                      {balance.netBalance >= 0 ? 'owes you' : 'you owe'}
                    </p>
                  </div>
                </div>

                {/* Balance Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 relative">
                  {balance.owesYou > 0 && (
                    <div className="bg-emerald-900/50 border border-emerald-600/50 rounded-xl p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-emerald-400 text-lg">💚</span>
                        <span className="font-semibold text-emerald-300">Owes You</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">+${balance.owesYou.toFixed(2)}</div>
                    </div>
                  )}
                  {balance.youOwe > 0 && (
                    <div className="bg-red-900/50 border border-red-600/50 rounded-xl p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-red-400 text-lg">💸</span>
                        <span className="font-semibold text-red-300">You Owe</span>
                      </div>
                      <div className="text-2xl font-bold text-red-400">-${balance.youOwe.toFixed(2)}</div>
                    </div>
                  )}
                </div>

                {/* Transaction History */}
                <div className="relative">
                  <h4 className="text-lg font-semibold text-gray-200 mb-4 flex items-center">
                    <span className="mr-2">📋</span>
                    Transaction History
                  </h4>
                  <div className="space-y-3">
                    {getPaginatedExpenses(balance.expenses, balance.userId).map((expense, index) => (
                      <div key={index} className="bg-gray-700/50 border border-gray-600/50 rounded-xl p-4 hover:bg-gray-600/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`text-lg ${expense.type === 'owes_you' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {expense.type === 'owes_you' ? '💚' : '💸'}
                              </span>
                              <h5 className="font-semibold text-gray-200">{expense.description}</h5>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <span>📅 {new Date(expense.date).toLocaleDateString()}</span>
                              <span>🏷️ {expense.category}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xl font-bold ${expense.type === 'owes_you' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {expense.type === 'owes_you' ? '+' : '-'}${expense.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {balance.expenses.length > ITEMS_PER_PAGE && (
                    <div className="flex justify-start mt-6">
                      <div className="flex items-center space-x-2">
                        {Array.from({ length: getTotalPages(balance.expenses) }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(balance.userId, pageNum)}
                            className={`w-10 h-10 flex items-center justify-center font-semibold transition-all duration-200 ${
                              getCurrentPage(balance.userId) === pageNum
                                ? 'bg-blue-500 text-white shadow-lg'
                                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-gray-200'
                            }`}
                            style={{ borderRadius: '4px' }} // Square boxes
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-emerald-400 to-violet-500 rounded-full flex items-center justify-center">
                <span className="text-5xl">✨</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-200 mb-4">
                {selectedFilter === 'all' ? 'All settled up!' : 
                 selectedFilter === 'owes_you' ? 'No one owes you money!' : 
                 'You don\'t owe anyone!'}
              </h3>
              <p className="text-gray-400 mb-6">
                {selectedFilter === 'all' ? 'No outstanding balances with friends.' :
                 'Try a different filter or create some new expenses.'}
              </p>
              <Link
                href="/chat"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span>💬</span>
                <span>Create New Expense</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
