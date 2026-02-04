'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  DollarSign,
  Trophy
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Import our new analytics hooks
import { useAnalytics } from '../../hooks/useAnalytics';

// Import components we'll create
import AIHighlights from '../../components/insights/AIHighlights';
import BadgesSection from '../../components/insights/BadgesSection';
import MilestonesSection from '../../components/insights/MilestonesSection';
import SpendingStreaks from '../../components/insights/SpendingStreaks';
import SummarySnapshot from '../../components/insights/SummarySnapshot';
import TrendOverview from '../../components/insights/TrendOverview';

interface User {
  email: string;
  name: string;
  id?: string;
}

interface AnalyticsData {
  totalSpentThisMonth: number;
  mostActiveCategory: {
    name: string;
    percentage: number;
  };
  netBalance: number;
  topFriend: {
    name: string;
    amount: number;
  };
  badges: any[];
  trends: any[];
  milestones: any[];
  streaks: any;
  aiSummary: string;
}

export default function InsightsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Client-side only flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get user data
  useEffect(() => {
    if (isClient) {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser({
          email: user.email,
          name: user.name,
          id: user.id
        });
      }
    }
  }, [isClient]);

  // Use our new analytics hooks with caching
  const totalSpentAnalytics = useAnalytics({
    userId: currentUser?.id || '',
    type: 'total_spent',
    timeframe: 'this_month'
  });

  const categoryAnalytics = useAnalytics({
    userId: currentUser?.id || '',
    type: 'category_breakdown',
    timeframe: 'this_month'
  });

  const friendAnalytics = useAnalytics({
    userId: currentUser?.id || '',
    type: 'friend_expenses',
    timeframe: 'this_month'
  });

  // Process analytics data when all data is loaded
  useEffect(() => {
    if (totalSpentAnalytics.data && categoryAnalytics.data && friendAnalytics.data && currentUser?.id) {
      const dashboardResponse = fetch(`/api/dashboard?userId=${currentUser.id}`)
        .then(res => res.json())
        .then(dashboard => {
          // Process and structure the data for our components
          const processedData: AnalyticsData = {
            totalSpentThisMonth: totalSpentAnalytics.data?.total_spent || 0,
            mostActiveCategory: getMostActiveCategory(categoryAnalytics.data?.categories || []),
            netBalance: dashboard.balances?.summary?.netBalance || 0,
            topFriend: getTopFriend(friendAnalytics.data?.friend_expenses || []),
            badges: generateBadges(categoryAnalytics.data?.categories || [], friendAnalytics.data?.friend_expenses || []),
            trends: processTrendData(dashboard.expenses?.expenses || []),
            milestones: generateMilestones(totalSpentAnalytics.data?.total_spent || 0, dashboard.expenses?.expenses || []),
            streaks: calculateStreaks(dashboard.expenses?.expenses || []),
            aiSummary: generateAISummary(
              totalSpentAnalytics.data?.total_spent || 0,
              getMostActiveCategory(categoryAnalytics.data?.categories || []),
              getTopFriend(friendAnalytics.data?.friend_expenses || [])
            )
          };

          setAnalyticsData(processedData);
        })
        .catch(error => {
          console.error('Error loading dashboard data:', error);
        });
    }
  }, [totalSpentAnalytics.data, categoryAnalytics.data, friendAnalytics.data, currentUser?.id]);

  // Determine loading state
  const isLoading = totalSpentAnalytics.isLoading || categoryAnalytics.isLoading || friendAnalytics.isLoading;

  // Helper functions
  const getMostActiveCategory = (categories: any[]) => {
    if (!categories.length) return { name: 'No expenses yet', percentage: 0 };
    const total = categories.reduce((sum, cat) => sum + cat.amount, 0);
    const topCategory = categories.reduce((prev, current) => 
      prev.amount > current.amount ? prev : current
    );
    return {
      name: topCategory.category || 'Other',
      percentage: total > 0 ? Math.round((topCategory.amount / total) * 100) : 0
    };
  };

  const getTopFriend = (friendExpenses: any[]) => {
    if (!friendExpenses.length) return { name: 'No shared expenses yet', amount: 0 };
    const topFriend = friendExpenses.reduce((prev, current) => 
      prev.total_amount > current.total_amount ? prev : current
    );
    return {
      name: topFriend.friend_name || 'Unknown',
      amount: topFriend.total_amount || 0
    };
  };

  const generateBadges = (categories: any[], friends: any[]) => {
    const badges = [];
    
    // Big Spender badge
    if (friends.length > 0) {
      const bigSpender = friends.reduce((prev, current) => 
        prev.total_amount > current.total_amount ? prev : current
      );
      badges.push({
        type: 'big_spender',
        title: 'Big Spender',
        description: `${bigSpender.friend_name} - ₹${bigSpender.total_amount.toFixed(0)}`,
        icon: DollarSign,
        color: 'bg-gradient-to-r from-yellow-500 to-orange-500'
      });
    }

    // Category King/Queen
    if (categories.length > 0) {
      const topCategory = categories.reduce((prev, current) => 
        prev.amount > current.amount ? prev : current
      );
      badges.push({
        type: 'category_king',
        title: `${topCategory.category} Champion`,
        description: `₹${topCategory.amount.toFixed(0)} spent this month`,
        icon: Trophy,
        color: 'bg-gradient-to-r from-purple-500 to-pink-500'
      });
    }

    return badges;
  };

  const processTrendData = (expenses: any[]) => {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentExpenses = expenses.filter(exp => 
      new Date(exp.created_at) >= last30Days
    );

    // Group by week
    const weeklyData = recentExpenses.reduce((acc, expense) => {
      const date = new Date(expense.created_at);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!acc[weekKey]) {
        acc[weekKey] = 0;
      }
      acc[weekKey] += expense.total_amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(weeklyData)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-4)
      .map(([week, amount]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount
      }));
  };

  const generateMilestones = (totalSpent: number, expenses: any[]) => {
    const milestones = [];
    
    // Spending milestones
    if (totalSpent >= 10000) {
      milestones.push({
        title: '₹10,000 Club',
        description: 'You\'ve crossed ₹10,000 in shared expenses this year! 🎉',
        achieved: true,
        type: 'spending'
      });
    }

    // Expense count milestones
    if (expenses.length >= 100) {
      milestones.push({
        title: 'Century Club',
        description: `100+ expenses logged! You're on a roll! 📊`,
        achieved: true,
        type: 'activity'
      });
    }

    return milestones;
  };

  const calculateStreaks = (expenses: any[]) => {
    const sortedExpenses = expenses
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    let currentStreak = 0;
    let longestStreak = 0;
    let streakCount = 0;
    let lastDate = null;

    for (const expense of sortedExpenses) {
      const expenseDate = new Date(expense.created_at).toDateString();
      
      if (lastDate === null) {
        currentStreak = 1;
        lastDate = expenseDate;
      } else if (lastDate === expenseDate) {
        continue; // Same day, don't increment
      } else {
        const daysDiff = Math.abs(
          (new Date(expenseDate).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
        lastDate = expenseDate;
      }
      streakCount++;
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    return {
      current: currentStreak,
      longest: longestStreak,
      totalDays: streakCount
    };
  };

  const generateAISummary = (totalSpent: number, mostActiveCategory: any, topFriend: any) => {
    if (totalSpent === 0) {
      return "Ready to start tracking your expenses? Add your first bill to see insights!";
    }

    return `This month, you spent ₹${totalSpent.toFixed(0)} mostly on ${mostActiveCategory.name.toLowerCase()} (${mostActiveCategory.percentage}%), with ${topFriend.name} being your top expense buddy.`;
  };

  if (!isClient) {
    return null; // Prevent hydration issues
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-4 md:p-8 min-h-full">
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
        <motion.div
          className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-blue-600/20 rounded-full mix-blend-lighten filter blur-xl"
          animate={{
            x: [0, 60, 0],
            y: [0, -60, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-violet-400" />
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Financial Insights
            </h1>
          </div>
          <p className="text-gray-400">
            Discover patterns, celebrate milestones, and optimize your spending habits
          </p>
        </motion.div>

        {/* AI Highlights - Top Section */}
        {analyticsData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <AIHighlights summary={analyticsData.aiSummary} isLoading={isLoading} />
          </motion.div>
        )}

        {/* Summary Snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <SummarySnapshot data={analyticsData} isLoading={isLoading} />
        </motion.div>

        {/* Badges & Titles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <BadgesSection  badges={analyticsData?.badges || []} isLoading={isLoading} />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Trends & Streaks */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <TrendOverview trends={analyticsData?.trends || []} isLoading={isLoading} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <SpendingStreaks streaks={analyticsData?.streaks} isLoading={isLoading} />
            </motion.div>
          </div>

          {/* Right Column - Milestones */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <MilestonesSection milestones={analyticsData?.milestones || []} isLoading={isLoading} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
