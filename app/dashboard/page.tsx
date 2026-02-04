'use client'

import QuickStats from "@/components/dashboard/QuickStats";
import RecentActivity from "@/components/dashboard/RecentActivity";
import SpendingCharts from "@/components/dashboard/SpendingChart";
import TopGroups from "@/components/dashboard/TopGroup";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  payer: string;
  participants?: { 
    email: string; 
    share: number; 
    paid: boolean 
  }[];
  category: string;
  group_id?: string;
  group_name?: string;
  created_date: string;
  status: string;
}

interface Group {
  id: string;
  name: string;
  color?: string;
  members?: string[];
  memberCount?: number;
  totalExpenses?: number;
  created_date?: string;
}

interface User {
  email: string;
  name?: string;
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [balanceData, setBalanceData] = useState({
    youOwe: 0,
    owedToYou: 0,
    netBalance: 0
  });

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const calculateBalances = useCallback((transactions: Transaction[], userEmail?: string) => {
    if (!userEmail) return;
    
    let youOwe = 0;
    let owedToYou = 0;

    transactions.forEach(transaction => {
      if (transaction.payer === userEmail) {
        transaction.participants?.forEach(participant => {
          if (participant.email !== userEmail && !participant.paid) {
            owedToYou += participant.share;
          }
        });
      } else {
        const userParticipant = transaction.participants?.find(p => p.email === userEmail);
        if (userParticipant && !userParticipant.paid) {
          youOwe += userParticipant.share;
        }
      }
    });

    const netBalance = owedToYou - youOwe;
    setBalanceData({ youOwe, owedToYou, netBalance });
  }, []); 

  // Load real data from APIs - OPTIMIZED: Single API call
  const loadData = useCallback(async () => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    setIsLoading(true);
    try {
      // Get the actual logged-in user data from localStorage
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('No user data found');
      }
      
      const user = JSON.parse(userData);
      const userId = user.id;
      
      // Set the current user from localStorage
      setCurrentUser({
        email: user.email,
        name: user.name
      });

      // OPTIMIZED: Single API call for all dashboard data
      const dashboardResponse = await fetch(`/api/dashboard?userId=${userId}`);
      const dashboardData = await dashboardResponse.json();
      
      if (dashboardData.success) {
        console.log('Dashboard data loaded:', dashboardData.cached ? 'from cache' : 'from database');
        
        // Transform expenses data to match our interface
        const transformedTransactions: Transaction[] = dashboardData.expenses.expenses.map((expense: any) => {
          // Calculate status based on payment progress
          const totalSplits = expense.splits.length;
          const paidSplits = expense.splits.filter((split: any) => split.paid).length;
          let status = "pending";
          if (paidSplits === totalSplits) {
            status = "paid";
          } else if (paidSplits > 0) {
            status = "partial";
          }

          return {
            id: expense.id,
            description: expense.description,
            amount: expense.total_amount,
            payer: expense.created_by, // Use the actual creator
            participants: expense.splits.map((split: any) => ({
              email: split.user_id, // Using user_id as email for now
              share: split.amount,
              paid: split.paid || false // Use actual paid status from database
            })),
            category: expense.category,
            group_id: expense.group_id, // Include group_id from API
            group_name: expense.group_name, // Include group_name from API
            created_date: expense.created_at,
            status: status // Use calculated status based on payments
          };
        });
        setTransactions(transformedTransactions);

        // Transform groups data
        const transformedGroups: Group[] = dashboardData.groups.groups.map((group: any) => ({
          id: group.id,
          name: group.name,
          color: "blue", // Default color, you could add this to your schema
          members: group.members.map((member: any) => member.user_id),
          memberCount: group.memberCount || group.members.length,
          totalExpenses: group.totalExpenses || 0,
          created_date: group.created_at
        }));
        setGroups(transformedGroups);

        // Set balance data directly from API
        setBalanceData({
          youOwe: dashboardData.balances.summary.totalYouOwe,
          owedToYou: dashboardData.balances.summary.totalOwedToYou,
          netBalance: dashboardData.balances.summary.netBalance
        });
      }

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      
      // Fallback: try to get user data from localStorage even if APIs fail
      if (typeof window !== 'undefined') {
        try {
          const userData = localStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            setCurrentUser({ email: user.email, name: user.name });
          }
        } catch (userError) {
          console.error("Error parsing user data:", userError);
        }
      }
      
      // Set empty data as fallback
      setTransactions([]);
      setGroups([]);
      setBalanceData({ youOwe: 0, owedToYou: 0, netBalance: 0 });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isClient) {
      loadData();
    }
  }, [isClient, loadData]); 

  return (
    <div className="relative bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-4 md:p-8 min-h-full overflow-hidden">
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

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            Welcome back
            {currentUser?.name && (
              <span className="ml-2 text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                , {currentUser.name}!
              </span>
            )}
          </h1>
          <p className="text-gray-400">Here's your expense overview</p>
        </motion.div>

        <div className="grid gap-6">
          <QuickStats 
            balanceData={balanceData} 
            totalTransactions={transactions.length}
            totalGroups={groups.length}
            isLoading={isLoading}
          />

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <RecentActivity 
                transactions={transactions}
                currentUser={currentUser}
                groups={groups}
                isLoading={isLoading}
              />
              <SpendingCharts 
                transactions={transactions}
                isLoading={isLoading}
              />
            </div>

            <div className="space-y-6">
              <TopGroups 
                groups={groups}
                transactions={transactions}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
