'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Child {
  relationship_id: string;
  child_id: string;
  child_name: string;
  child_email: string;
  child_phone: string;
  threshold_amount: number | string; // Can be either from DB
  relationship_created: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChildAnalyticsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Utility function to safely convert threshold to number
  const getThresholdAmount = (threshold: number | string): number => {
    return typeof threshold === 'number' ? threshold : parseFloat(threshold.toString()) || 0;
  };

  useEffect(() => {
    fetchChildren();
    
    // Add welcome message
    setMessages([{
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your child spending analytics assistant. You can ask me questions like:\n\n• "How much did Alex spend this month?"\n• "What categories does Sarah spend most on?"\n• "Show me Emma\'s recent transactions"\n• "Which child is closest to their spending limit?"\n\nFeel free to ask me anything about your children\'s spending patterns!',
      timestamp: new Date()
    }]);
  }, []);

  const fetchChildren = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parent/children', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChildren(data.children);
      } else {
        toast.error('Failed to fetch children');
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      toast.error('Error fetching children');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          childId: selectedChild || undefined,
          dateRange: (dateRange.startDate && dateRange.endDate) ? dateRange : undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        toast.error(data.error || 'Failed to get response');
        
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'I apologize, but I encountered an error while processing your request. Please try again.',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Network error');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I\'m sorry, but I\'m having trouble connecting right now. Please check your internet connection and try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "How much did my children spend this month?",
    "Which child is closest to their spending limit?",
    "What are the top spending categories?",
    "Show me recent transactions for all children",
    "Compare spending between my children"
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Child Analytics Chatbot</h1>
        <p className="text-gray-600 mt-2">Ask questions about your children's spending patterns and get AI-powered insights</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Child Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Focus on Child (Optional)
            </label>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Children</option>
              {children.map((child) => (
                <option key={child.child_id} value={child.child_id}>
                  {child.child_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date (Optional)
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-md h-96 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-purple-200' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <span>Analyzing spending data...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about your children's spending..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Suggested Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleSuggestedQuestion(question)}
              className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              disabled={isLoading}
            >
              <div className="text-sm text-gray-700">{question}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Summary */}
      {children.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {children.slice(0, 3).map((child) => (
              <div key={child.child_id} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{child.child_name}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Threshold: ${getThresholdAmount(child.threshold_amount).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Added {new Date(child.relationship_created).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
