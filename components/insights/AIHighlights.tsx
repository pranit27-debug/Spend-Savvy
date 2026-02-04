'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Brain, Sparkles, TrendingUp } from 'lucide-react';

interface AIHighlightsProps {
  summary: string;
  isLoading: boolean;
}

export default function AIHighlights({ summary, isLoading }: AIHighlightsProps) {
  if (isLoading) {
    return (
      <Card className="shadow-xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50 text-white">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-violet-900/50 rounded-xl">
              <Brain className="w-6 h-6 text-violet-400" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-32 bg-gray-700/50" />
              </div>
              <Skeleton className="h-4 w-full bg-gray-700/50" />
              <Skeleton className="h-4 w-3/4 bg-gray-700/50" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card className="shadow-xl border-0 bg-gray-800/80 backdrop-blur-lg border border-gray-700/50 text-white overflow-hidden relative group">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900/30" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-600/10 rounded-full translate-y-12 -translate-x-12 group-hover:scale-125 transition-transform duration-700" />
        
        <CardContent className="p-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-start gap-4"
          >
            {/* AI Brain Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="p-3 bg-violet-900/50 rounded-xl backdrop-blur-sm"
            >
              <Brain className="w-6 h-6 text-violet-400" />
            </motion.div>
            
            {/* Content */}
            <div className="flex-1 space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h2 className="text-lg font-semibold text-gray-100">
                  AI Financial Insights
                </h2>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-gray-200 text-sm leading-relaxed font-medium"
              >
                {summary}
              </motion.p>
              
              {/* Animated dots for AI thinking effect */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center gap-2 text-gray-400 text-xs"
              >
                <TrendingUp className="w-3 h-3" />
                <span>Updated in real-time based on your spending patterns</span>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex gap-1"
                >
                  <div className="w-1 h-1 bg-white/60 rounded-full" />
                  <div className="w-1 h-1 bg-white/60 rounded-full" />
                  <div className="w-1 h-1 bg-white/60 rounded-full" />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
