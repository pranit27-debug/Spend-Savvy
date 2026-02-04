'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/chats/ChatMessage";
import { ChatSuggestion } from "@/components/chats/ChatSuggestion";
import { Send, Bot } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
  id: string;
  sender: {
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: Date;
  isUser: boolean;
}

const suggestions = [
  "How do I split an expense?",
  "Show me my recent transactions",
  "Who owes me money?",
  "How to create a new group?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: {
        name: 'BillBuddy',
        avatar: '/globe.svg',
      },
      content: 'Hi there! 👋 I\'m your BillBuddy assistant. How can I help you manage your expenses today?',
      timestamp: new Date(),
      isUser: false,
    },
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: {
        name: 'You',
      },
      content: inputValue,
      timestamp: new Date(),
      isUser: true,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock bot response based on user input
      let botResponse = "I'm not sure how to help with that yet. Could you try asking something about expenses or splitting bills?";
      
      if (inputValue.toLowerCase().includes('split')) {
        botResponse = "To split an expense, go to the 'Add Expense' page and select the group you want to split with. You can then enter the details and everyone will be notified of their share.";
      } else if (inputValue.toLowerCase().includes('transaction') || inputValue.toLowerCase().includes('history')) {
        botResponse = "You can view all your recent transactions on the Dashboard page. They're sorted by date with the most recent at the top.";
      } else if (inputValue.toLowerCase().includes('owe')) {
        botResponse = "Based on your current balances, Alex owes you $25.50 and you owe Jamie $12.75. You can send reminders from the Dashboard.";
      } else if (inputValue.toLowerCase().includes('group')) {
        botResponse = "To create a new group, go to the Groups page and click the 'New Group' button. You can then add members by searching for their names or email addresses.";
      }
      
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: {
          name: 'BillBuddy',
          avatar: '/globe.svg',
        },
        content: botResponse,
        timestamp: new Date(),
        isUser: false,
      };
      
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSend();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-slate-900">
            <Bot className="text-blue-500" />
            BillBuddy Assistant
          </h1>
          <p className="text-slate-500 mt-1">Ask me anything about your expenses</p>
        </motion.div>

        <div className="flex-1 overflow-hidden bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  id={message.id}
                  sender={message.sender}
                  content={message.content}
                  timestamp={message.timestamp}
                  isUser={message.isUser}
                />
              ))}
              {isLoading && (
                <div className="flex items-center space-x-2 text-slate-400 pl-2">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>●</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {true && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70">
              <p className="text-xs text-slate-500 mb-2">Suggested questions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <ChatSuggestion
                    key={suggestion}
                    text={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                  />
                ))}
              </div>
            </div>
          )}
          
          <div className="p-4 border-t border-slate-200">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 bg-white"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
