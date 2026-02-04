'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
    Award,
    Calendar,
    Flame,
    Target,
    Trophy,
    Zap
} from 'lucide-react';
import React from 'react';

interface SpendingStreaksProps {
  streaks: {
    current: number;
    longest: number;
    totalDays: number;
  } | null;
  isLoading: boolean;
}

const StreakCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color, 
  isHighlight = false 
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
  isHighlight?: boolean;
}) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.2 }}
    className={`p-4 rounded-xl transition-all duration-300 ${
      isHighlight 
        ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/25' 
        : 'bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/30'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${
        isHighlight ? 'bg-white/20' : color
      }`}>
        <Icon className={`w-5 h-5 ${
          isHighlight ? 'text-white' : 'text-white'
        }`} />
      </div>
      <div>
        <p className={`text-xs font-medium uppercase tracking-wide ${
          isHighlight ? 'text-white/80' : 'text-gray-400'
        }`}>
          {title}
        </p>
        <p className={`text-2xl font-bold ${
          isHighlight ? 'text-white' : 'text-gray-200'
        }`}>
          {value}
        </p>
        <p className={`text-xs ${
          isHighlight ? 'text-white/70' : 'text-gray-500'
        }`}>
          {subtitle}
        </p>
      </div>
    </div>
  </motion.div>
);

const getStreakMessage = (current: number, longest: number) => {
  if (current === 0) {
    return "Start logging expenses daily to build a streak! 🚀";
  } else if (current === 1) {
    return "Great start! Keep logging to build your streak 💪";
  } else if (current < 5) {
    return `Building momentum! You're on a ${current}-day streak 🔥`;
  } else if (current < 10) {
    return `Excellent consistency! ${current} days in a row 🌟`;
  } else {
    return `Amazing dedication! ${current} days of consistent tracking 🏆`;
  }
};

const getStreakEncouragement = (current: number, longest: number) => {
  if (current === longest && longest > 0) {
    return "🎉 You're on your longest streak ever!";
  } else if (current > 0 && longest > 0) {
    const remaining = longest - current;
    return `${remaining} more days to beat your record!`;
  } else {
    return "Start building your first streak today!";
  }
};

export default function SpendingStreaks({ streaks, isLoading }: SpendingStreaksProps) {
  if (isLoading) {
    return (
      <Card className="shadow-xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-400" />
            <CardTitle className="text-gray-200">Expense Tracking Streaks</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4 bg-gray-700/50" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-lg bg-gray-600/50" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-16 bg-gray-600/50" />
                      <Skeleton className="h-6 w-8 bg-gray-600/50" />
                      <Skeleton className="h-3 w-20 bg-gray-600/50" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const defaultStreaks = { current: 0, longest: 0, totalDays: 0 };
  const streakData = streaks || defaultStreaks;
  const message = getStreakMessage(streakData.current, streakData.longest);
  const encouragement = getStreakEncouragement(streakData.current, streakData.longest);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50 group relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900/30"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-600/10 to-transparent rounded-full transform translate-x-12 -translate-y-12 group-hover:scale-150 transition-transform duration-700"></div>
        
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" />
              <CardTitle className="text-gray-200">Expense Tracking Streaks</CardTitle>
            </div>
            {streakData.current > 0 && (
              <Badge variant="secondary" className="bg-orange-900/50 text-orange-300 border border-orange-700/50">
                <Flame className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
          
          {/* Motivational Message */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 p-3 bg-orange-900/30 rounded-lg border border-orange-700/30"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <p className="text-sm text-gray-300 font-medium">{message}</p>
          </motion.div>
        </CardHeader>
        
        <CardContent className="relative">
          <div className="space-y-6">
            {/* Streak Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StreakCard
                title="Current Streak"
                value={`${streakData.current}`}
                subtitle="days in a row"
                icon={Flame}
                color="bg-gradient-to-br from-orange-500 to-red-500"
                isHighlight={streakData.current > 0}
              />
              
              <StreakCard
                title="Longest Streak"
                value={`${streakData.longest}`}
                subtitle="personal record"
                icon={Trophy}
                color="bg-gradient-to-br from-yellow-500 to-orange-500"
              />
              
              <StreakCard
                title="Active Days"
                value={`${streakData.totalDays}`}
                subtitle="total days tracked"
                icon={Calendar}
                color="bg-gradient-to-br from-blue-500 to-cyan-500"
              />
            </div>

            {/* Encouragement Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center p-4 bg-gradient-to-r from-gray-700/50 to-gray-800/50 rounded-lg border border-gray-600/30"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-400" />
                <p className="text-sm font-medium text-gray-300">Progress Update</p>
              </div>
              <p className="text-sm text-gray-400">{encouragement}</p>
            </motion.div>

            {/* Streak Benefits */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Why streaks matter:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Build healthy financial habits</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Stay on top of your expenses</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>Improve financial awareness</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span>Unlock achievement badges</span>
                </div>
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
