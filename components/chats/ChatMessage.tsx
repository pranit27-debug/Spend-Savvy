'use client';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessageProps {
  id: string;
  sender: {
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: Date;
  isUser: boolean;
}

export function ChatMessage({ id, sender, content, timestamp, isUser }: ChatMessageProps) {
  const formattedTime = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {!isUser && (
        <div className="mr-2 flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={sender.avatar} />
            <AvatarFallback className="bg-blue-100 text-blue-800">
              {sender.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && (
          <span className="text-xs text-slate-500 ml-1 mb-1">{sender.name}</span>
        )}
        
        <div
          className={`rounded-2xl py-2 px-3 ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
              : 'bg-slate-100 text-slate-800'
          }`}
        >
          <p className="text-sm">{content}</p>
        </div>
        
        <span className="text-xs text-slate-400 mt-1 mx-1">
          {formattedTime}
        </span>
      </div>
      
      {isUser && (
        <div className="ml-2 flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={sender.avatar} />
            <AvatarFallback className="bg-blue-600 text-white">
              {sender.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </motion.div>
  );
}