'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
  Award,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import React from 'react';

interface BadgeItem {
  type: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface BadgesSectionProps {
  badges: BadgeItem[];
  isLoading: boolean;
}

const badgeVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

const BadgeCard = ({ badge, index }: { badge: BadgeItem; index: number }) => {
  const Icon = badge.icon;
  
  return (
    <motion.div
      variants={badgeVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.1 }}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      className="h-full"
    >
      <Card className={`overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full ${badge.color}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-lg">{badge.title}</h3>
                <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                  Achievement
                </Badge>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                {badge.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const defaultBadges: BadgeItem[] = [
  {
    type: 'quick_payer',
    title: 'Quick Payer',
    description: 'Fastest to settle debts - You\'re reliable!',
    icon: Zap,
    color: 'bg-gradient-to-r from-green-500 to-emerald-600'
  },
  {
    type: 'reliable_splitter',
    title: 'Reliable Splitter',
    description: 'Consistently pays on time - Keep it up!',
    icon: Clock,
    color: 'bg-gradient-to-r from-blue-500 to-cyan-600'
  },
  {
    type: 'steady_saver',
    title: 'Steady Saver',
    description: 'Balanced expenses - Great financial discipline!',
    icon: Target,
    color: 'bg-gradient-to-r from-indigo-500 to-purple-600'
  }
];

export default function BadgesSection({ badges, isLoading }: BadgesSectionProps) {
  // Show default badges if no data yet or combine with actual badges
  const displayBadges = badges.length > 0 ? badges : defaultBadges;
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          <h2 className="text-xl font-semibold text-slate-900">
            Achievement Badges
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2"
      >
        <Award className="w-5 h-5 text-amber-600" />
        <h2 className="text-xl font-semibold text-white">
          Achievement Badges
        </h2>
        <span className="text-sm text-slate-400">
          Your spending personality
        </span>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayBadges.map((badge, index) => (
          <BadgeCard key={badge.type} badge={badge} index={index} />
        ))}
      </div>

      {/* Achievement Description */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <p className="text-sm text-slate-400">
          Badges are earned based on your spending patterns and payment behavior. 
          Keep using the app to unlock more achievements!
        </p>
      </motion.div>
    </div>
  );
}
