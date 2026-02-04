'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface ChatSuggestionProps {
  text: string;
  onClick: () => void;
}

export function ChatSuggestion({ text, onClick }: ChatSuggestionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="mb-3"
    >
      <Button 
        variant="outline" 
        onClick={onClick}
        className="bg-white/80 border-blue-100 hover:border-blue-300 hover:bg-blue-50 text-blue-700 font-normal text-sm px-4 py-2 h-auto rounded-full inline-flex items-center"
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
        {text}
      </Button>
    </motion.div>
  );
}