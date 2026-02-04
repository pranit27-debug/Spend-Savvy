'use client';
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Users, Smile, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  message_type: 'text' | 'expense' | 'system';
  created_at: string;
  metadata?: any;
}

interface GroupChatSectionProps {
  groupId: string;
  currentUserId: string;
}

export default function GroupChatSection({ groupId, currentUserId }: GroupChatSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages(true); // Initial load
    const interval = setInterval(() => loadMessages(false), 5000); // Polling without auto-scroll
    return () => clearInterval(interval);
  }, [groupId]);

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
      setShouldAutoScroll(false); // Reset the flag after scrolling
    }
  }, [messages, shouldAutoScroll]);

  const loadMessages = async (isInitialLoad = false) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/messages?userId=${currentUserId}`);
      const data = await response.json();
      
      if (data.success) {
        const newMessages = data.messages || [];
        
        if (isInitialLoad) {
          setMessages(newMessages);
          setShouldAutoScroll(true); // Auto-scroll on initial load
        } else {
          // For polling updates, check if there are actually new messages
          setMessages(prevMessages => {
            const prevMessageIds = new Set(prevMessages.map(msg => msg.id));
            const hasNewMessages = newMessages.some((msg: { id: string; }) => !prevMessageIds.has(msg.id));
            
            // Only auto-scroll if the user is near the bottom of the chat
            if (hasNewMessages) {
              const messagesContainer = messagesEndRef.current?.parentElement;
              if (messagesContainer) {
                const isNearBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 100;
                if (isNearBottom) {
                  setShouldAutoScroll(true);
                }
              }
            }
            
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      const response = await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          message: messageText,
          messageType: 'text'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const newMsg: ChatMessage = {
          id: data.message.id,
          user_id: currentUserId,
          user_name: data.message.user_name,
          message: messageText,
          message_type: 'text',
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, newMsg]);
        setShouldAutoScroll(true); // Always auto-scroll for own messages
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
    }
    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  const getUserColor = (userId: string) => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-green-400 to-green-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-red-400 to-red-600',
      'from-yellow-400 to-yellow-600',
      'from-teal-400 to-teal-600'
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isOwnMessage = message.user_id === currentUserId;
    const prevMessage = messages[index - 1];
    const showAvatar = !prevMessage || prevMessage.user_id !== message.user_id || prevMessage.message_type !== 'text';
    const isConsecutive = prevMessage && prevMessage.user_id === message.user_id && prevMessage.message_type === 'text';
    
    if (message.message_type === 'system') {
      return (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center my-6"
        >
          <Badge variant="outline" className="bg-slate-50/80 text-slate-600 border-slate-200 px-4 py-2 rounded-full text-xs font-medium">
            {message.message}
          </Badge>
        </motion.div>
      );
    }

    if (message.message_type === 'expense') {
      return (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center my-4"
        >
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl p-4 max-w-sm shadow-sm">
            <div className="flex items-center gap-3 text-green-700">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">{message.message}</span>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 ${isConsecutive ? 'mt-1' : 'mt-4'} ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex gap-3 max-w-[75%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isOwnMessage && (
            <div className="flex-shrink-0">
              {showAvatar ? (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={`bg-gradient-to-r ${getUserColor(message.user_id)} text-white text-xs font-semibold`}>
                    {getInitials(message.user_name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-8 h-8" />
              )}
            </div>
          )}
          
          <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
            {!isOwnMessage && showAvatar && (
              <p className="text-xs font-medium text-slate-600 mb-1 px-1">{message.user_name}</p>
            )}
            
            <div className={`group relative ${
              isOwnMessage 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' 
                : 'bg-white border border-slate-200 text-slate-900 shadow-sm hover:shadow-md'
            } rounded-2xl px-4 py-2.5 transition-all duration-200`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
              
              {/* Timestamp on hover */}
              <div className={`absolute ${
                isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'
              } top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}>
                <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100 whitespace-nowrap">
                  {formatMessageTime(message.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-[600px] max-w-4xl mx-auto">
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 h-full flex flex-col overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 shrink-0">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Group Chat</h3>
                <p className="text-sm text-slate-500">{messages.length} messages</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-sm text-slate-500">Online</span>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                  <p className="text-sm text-slate-500">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">Welcome to your group chat!</h3>
                <p className="text-slate-500 max-w-sm">Start a conversation with your group members. Share updates, discuss expenses, and stay connected.</p>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((message, index) => renderMessage(message, index))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-slate-100 bg-white p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="w-full rounded-2xl border-slate-200 focus:border-blue-300 focus:ring-blue-200 py-3 px-4 pr-12 resize-none min-h-[44px] transition-all duration-200"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 h-8 w-8 p-0"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                className={`rounded-2xl h-11 w-11 p-0 transition-all duration-200 ${
                  newMessage.trim() 
                    ? 'bg-blue-500 hover:bg-blue-600 shadow-md hover:shadow-lg' 
                    : 'bg-slate-200 cursor-not-allowed'
                }`}
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Send className={`w-4 h-4 ${newMessage.trim() ? 'text-white' : 'text-slate-400'}`} />
                )}
              </Button>
            </div>
            
            {isTyping && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-slate-400 mt-2 px-1"
              >
                Press Enter to send, Shift + Enter for new line
              </motion.p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}