'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
    Calendar,
    CheckCircle,
    Circle,
    DollarSign,
    Star,
    Target,
    Trophy,
    Users
} from 'lucide-react';

interface Milestone {
  title: string;
  description: string;
  achieved: boolean;
  type: 'spending' | 'activity' | 'social';
  progress?: number;
  target?: number;
}

interface MilestonesSectionProps {
  milestones: Milestone[];
  isLoading: boolean;
}

const milestoneIcons = {
  spending: DollarSign,
  activity: Calendar,
  social: Users
};

const milestoneColors = {
  spending: 'bg-gradient-to-r from-green-500 to-emerald-600',
  activity: 'bg-gradient-to-r from-blue-500 to-cyan-600',
  social: 'bg-gradient-to-r from-purple-500 to-pink-600'
};

const defaultMilestones: Milestone[] = [
  {
    title: 'First Steps',
    description: 'Welcome to spendsavvy! Start tracking your expenses.',
    achieved: true,
    type: 'activity'
  },
  {
    title: '₹1,000 Club',
    description: 'Log ₹1,000 worth of shared expenses',
    achieved: false,
    type: 'spending',
    progress: 0,
    target: 1000
  },
  {
    title: 'Social Spender',
    description: 'Add expenses with 3 different friends',
    achieved: false,
    type: 'social',
    progress: 0,
    target: 3
  },
  {
    title: '10 Expense Streak',
    description: 'Log 10 expenses in the app',
    achieved: false,
    type: 'activity',
    progress: 0,
    target: 10
  }
];

const MilestoneCard = ({ milestone, index }: { milestone: Milestone; index: number }) => {
  const Icon = milestoneIcons[milestone.type];
  const StatusIcon = milestone.achieved ? CheckCircle : Circle;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group"
    >
      <Card className={`overflow-hidden border transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/20 ${
        milestone.achieved 
          ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-700/50' 
          : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600/50 backdrop-blur-lg'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Status Icon */}
            <div className={`p-2 rounded-full ${
              milestone.achieved 
                ? 'bg-green-900/60' 
                : 'bg-gray-700/50 group-hover:bg-gray-600/50'
            } transition-colors`}>
              <StatusIcon className={`w-4 h-4 ${
                milestone.achieved ? 'text-green-400' : 'text-gray-400'
              }`} />
            </div>
            
            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${
                  milestone.achieved ? 'text-green-300' : 'text-gray-200'
                }`}>
                  {milestone.title}
                </h3>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    milestone.achieved 
                      ? 'bg-green-900/50 text-green-300 border-green-700/30' 
                      : 'bg-gray-700/50 text-gray-300 border-gray-600/30'
                  }`}
                >
                  {milestone.type}
                </Badge>
              </div>
              
              <p className={`text-sm ${
                milestone.achieved ? 'text-green-400' : 'text-gray-400'
              }`}>
                {milestone.description}
              </p>
              
              {/* Progress Bar (if not achieved and has progress) */}
              {!milestone.achieved && milestone.progress !== undefined && milestone.target && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{milestone.progress}</span>
                    <span>{milestone.target}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((milestone.progress / milestone.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Type Icon */}
            <div className={`p-2 rounded-lg ${milestoneColors[milestone.type]}`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
          </div>
          
          {milestone.achieved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-3 flex items-center gap-1 text-green-400"
            >
              <Trophy className="w-3 h-3" />
              <span className="text-xs font-medium">Completed!</span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function MilestonesSection({ milestones, isLoading }: MilestonesSectionProps) {
  // Use default milestones if none provided or combine with actual milestones
  const displayMilestones = milestones.length > 0 ? milestones : defaultMilestones;
  const achievedCount = displayMilestones.filter(m => m.achieved).length;
  
  if (isLoading) {
    return (
      <Card className="shadow-xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-gray-200">Milestones</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full bg-gray-700/50" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-gray-700/50" />
                  <Skeleton className="h-3 w-full bg-gray-700/50" />
                </div>
                <Skeleton className="w-8 h-8 rounded-lg bg-gray-700/50" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50 group relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900/30"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-600/10 to-transparent rounded-full transform translate-x-12 -translate-y-12 group-hover:scale-150 transition-transform duration-700"></div>
        
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <CardTitle className="text-gray-200">Milestones</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-amber-900/50 text-amber-300 border border-amber-700/50">
              {achievedCount}/{displayMilestones.length} completed
            </Badge>
          </div>
          
          {/* Progress Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 p-3 bg-amber-900/30 rounded-lg border border-amber-700/30"
          >
            <Star className="w-4 h-4 text-amber-400" />
            <p className="text-sm text-gray-300">
              {achievedCount === displayMilestones.length 
                ? "🎉 All milestones completed! You're amazing!"
                : `${displayMilestones.length - achievedCount} more to go - keep it up!`
              }
            </p>
          </motion.div>
        </CardHeader>
        
        <CardContent className="relative">
          <div className="space-y-3">
            {displayMilestones.map((milestone, index) => (
              <MilestoneCard 
                key={milestone.title} 
                milestone={milestone} 
                index={index}
              />
            ))}
          </div>
          
          {/* Achievement Encouragement */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-center"
          >
            <p className="text-xs text-gray-400">
              Milestones celebrate your progress and encourage healthy spending habits. 
              Keep using spendsavvy to unlock more achievements!
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
