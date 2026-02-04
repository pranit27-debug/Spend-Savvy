'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Friend {
  id: string;
  name: string;
  email: string;
  phone: string;
  displayText: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'confirmation';
  content: string;
  timestamp: Date;
  data?: any;
  metadata?: {
    billId?: string;
    billData?: any;
  };
}

interface ParsedExpense {
  description: string;
  amount?: number;
  totalAmount?: number;
  category: string;
  friendNames?: string[];
  friendIds?: string[];
  matchedFriends?: any[];
  allParticipants?: any[];
  splits?: any[];
  splitType?: string;
  confidence?: number;
  reasoning?: string;
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);
  
  // Autocomplete states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [friendSuggestions, setFriendSuggestions] = useState<Friend[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/signin');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsLoading(false);
      
      // Add welcome message
      setMessages([{
        id: '1',
        type: 'bot',
        content: `Hi ${parsedUser.name}! 👋 I'm your AI expense splitting assistant. 

💬 **How to use me:**
• Just type naturally: "Split $50 for dinner with John and Mary"
• I'll understand amounts, categories, and friend names
• Start typing a friend's name and I'll show suggestions
• Use ↑↓ arrows to navigate suggestions, Enter to select

🚀 **Examples:**
• "I paid $25 for coffee with Sarah"
• "Split the $120 Uber ride with John, Mike, and Lisa"
• "Dinner at pizza place cost $80, split with my roommates"

Try it now! What expense would you like to split?`,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/signin');
    }
  }, [router]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search friends for autocomplete
  const searchFriends = useCallback(async (query: string) => {
    if (!user || !query.trim() || query.length < 2) {
      setFriendSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    try {
      const response = await fetch(`/api/friends/search?userId=${user.id}&query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setFriendSuggestions(data.friends || []);
          setShowSuggestions(data.friends?.length > 0);
          setSelectedSuggestionIndex(-1); // Reset selection
        } else {
          console.error('Non-JSON response from friends search API');
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        }
      } else {
        console.error('Friends search API error:', response.status, response.statusText);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    } catch (error) {
      console.error('Error searching friends:', error);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [user]);

  // Handle input changes and detect when user is typing a name
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    
    setInputValue(value);
    setCursorPosition(position);

    // Find the current word being typed
    const textBeforeCursor = value.substring(0, position);
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1] || '';
    
    setCurrentWord(currentWord);

    // Trigger friend search if the word looks like a name (starts with capital or has @ symbol)
    // Also trigger on words after "with", "and", or common splitting phrases
    const triggerWords = ['with', 'and', 'split', 'share', 'divide'];
    const textLower = textBeforeCursor.toLowerCase();
    const shouldTrigger = currentWord.length >= 2 && (
      /^[A-Z]/.test(currentWord) || 
      currentWord.includes('@') ||
      triggerWords.some(word => textLower.includes(word + ' ')) ||
      /\b(with|and)\s+\w*$/i.test(textBeforeCursor)
    );

    if (shouldTrigger) {
      searchFriends(currentWord);
    } else {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Handle friend suggestion selection
  const selectFriend = (friend: Friend) => {
    const textBeforeCursor = inputValue.substring(0, cursorPosition);
    const textAfterCursor = inputValue.substring(cursorPosition);
    const words = textBeforeCursor.split(/\s+/);
    
    // Replace the current word with the friend's name
    words[words.length - 1] = friend.name;
    const newText = words.join(' ') + ' ' + textAfterCursor;
    
    setInputValue(newText);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    // Focus back on input and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        const newPosition = words.join(' ').length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/chat/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          userId: user.id
        }),
      });

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses (like HTML error pages)
        const textResponse = await response.text();
        console.error('Non-JSON response from parse API:', textResponse);
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      if (data.success) {
        if (data.type === 'expense_split' && data.expense) {
          // Handle expense splitting
          const expense = data.expense as ParsedExpense;
          
          const confirmationMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'confirmation',
            content: `💡 ${expense.reasoning || 'Expense splitting details'}\n\n📋 **Expense Details:**\n• Description: ${expense.description}\n• Amount: $${expense.totalAmount || expense.amount}\n• Category: ${expense.category}\n• Splitting with: ${expense.splits?.map((s: any) => s.userName).join(', ') || expense.allParticipants?.map((p: any) => p.name).join(', ') || 'No participants'}\n\nDoes this look correct?`,
            timestamp: new Date(),
            data: expense
          };
          setMessages(prev => [...prev, confirmationMessage]);
          setPendingConfirmation(expense);
          
        } else if (data.type === 'analytics') {
          // Handle analytics queries
          setIsTyping(true);
          try {
            const analyticsResponse = await fetch(`/api/analytics?userId=${encodeURIComponent(user.id)}&type=${encodeURIComponent(data.data.type)}&timeframe=${encodeURIComponent(data.data.timeframe)}&category=${encodeURIComponent(data.data.category || '')}&subcategory=${encodeURIComponent(data.data.subcategory || '')}&friendId=${encodeURIComponent(data.data.friend || '')}`);
            
            if (analyticsResponse.ok) {
              const analyticsData = await analyticsResponse.json();
              
              let botContent = `📊 **${data.intent}**\n\n`;
              
              switch (data.data.type) {
                case 'total_spent':
                  const timeframeText = data.data.timeframe ? data.data.timeframe.replace('_', ' ') : 'overall';
                  botContent += `💰 Total spent ${timeframeText}: **$${analyticsData.data.total_spent.toFixed(2)}**`;
                  if (data.data.category) {
                    botContent += ` in ${data.data.category}`;
                  }
                  if (data.data.subcategory) {
                    botContent += ` → ${data.data.subcategory}`;
                  }
                  break;
                case 'category_breakdown':
                  const categoryTimeframe = data.data.timeframe ? data.data.timeframe.replace('_', ' ') : 'overall';
                  botContent += `📋 **Spending by category** (${categoryTimeframe}):\n\n`;
                  analyticsData.data.categories.forEach((cat: any) => {
                    botContent += `• ${cat.category}: $${cat.amount.toFixed(2)} (${cat.count} expenses)\n`;
                  });
                  break;
                case 'friend_expenses':
                  const friendTimeframe = data.data.timeframe ? data.data.timeframe.replace('_', ' ') : 'overall';
                  botContent += `👥 **Expenses with friends** (${friendTimeframe}):\n\n`;
                  analyticsData.data.friend_expenses.forEach((friend: any) => {
                    botContent += `• ${friend.friend_name}: $${friend.total_amount.toFixed(2)} (${friend.expense_count} expenses)\n`;
                  });
                  break;
              }
              
              const botMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: botContent,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, botMessage]);
            } else {
              throw new Error('Analytics API error');
            }
          } catch (error) {
            const errorMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              type: 'bot',
              content: `❌ Sorry, I had trouble getting your analytics data. Please try again.`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
          } finally {
            setIsTyping(false);
          }
          
        } else if (data.type === 'expense_history') {
          // Handle expense history queries
          setIsTyping(true);
          try {
            const historyResponse = await fetch(`/api/expenses/history?userId=${user.id}&timeframe=${data.data.timeframe}&category=${data.data.category || ''}&friendId=${data.data.friend || ''}&limit=${data.data.limit || 10}`);
            if (historyResponse.ok) {
              const historyData = await historyResponse.json();
              let botContent = `📜 **${data.intent}**\n\n`;
              
              if (historyData.expenses.length === 0) {
                botContent += 'No expenses found for the specified criteria.';
              } else {
                historyData.expenses.forEach((expense: any, index: number) => {
                  const date = new Date(expense.created_at).toLocaleDateString();
                  botContent += `${index + 1}. **${expense.description}** - $${expense.user_amount.toFixed(2)} (${date})\n`;
                  botContent += `   Category: ${expense.category}, Total: $${expense.total_amount.toFixed(2)}\n\n`;
                });
              }
              
              const botMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: botContent,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, botMessage]);
            } else {
              throw new Error('Failed to fetch expense history');
            }
          } catch (error) {
            const errorMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              type: 'bot',
              content: '❌ Sorry, I had trouble getting your expense history. Please try again.',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
          } finally {
            setIsTyping(false);
          }
          
        } else {
          // Handle general chat responses
          const botMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'bot',
            content: data.message || data.intent,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botMessage]);
        }
        
      } else if (data.error === 'friends_not_found') {
        // Handle friends not found with suggestions
        let botContent = `❌ ${data.message}\n\n`;
        
        if (data.suggestions && data.suggestions.length > 0) {
          botContent += `💡 **Did you mean:**\n`;
          data.suggestions.forEach((suggestion: any) => {
            botContent += `\n🔍 For "${suggestion.searched}":\n`;
            suggestion.suggestions.forEach((friend: any) => {
              botContent += `   • ${friend.name} (${friend.email})\n`;
            });
          });
        }
        
        if (data.availableFriends && data.availableFriends.length > 0) {
          botContent += `\n👥 **Your current friends:**\n`;
          data.availableFriends.slice(0, 5).forEach((friend: any) => {
            botContent += `   • ${friend.name} (${friend.email})\n`;
          });
          if (data.availableFriends.length > 5) {
            botContent += `   ... and ${data.availableFriends.length - 5} more\n`;
          }
        }
        
        botContent += `\n💭 **Tip:** Start typing a friend's name and I'll show suggestions!`;
        
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: botContent,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        
      } else {
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: data.message || "I didn't understand that as an expense splitting request. Try something like 'Split $50 for dinner with John and Mary'",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle confirmation
  const handleConfirmation = async (confirmed: boolean) => {
    if (!pendingConfirmation || !user) return;

    if (confirmed) {
      setIsTyping(true);
      try {
        const response = await fetch('/api/expenses/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            expense: pendingConfirmation
          }),
        });

        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          // Handle non-JSON responses
          throw new Error(`Server returned ${response.status}`);
        }
        
        if (response.ok && data.success) {
          const successMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'bot',
            content: `✅ Expense split successfully! Here's how it was divided:\n\n${data.splits.map((split: any) => 
              `• ${split.userName}: $${split.amount} (${split.percentage}%)`
            ).join('\n')}\n\n💾 The expense has been saved to your records.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMessage]);
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error('Error creating expense:', error);
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'bot',
          content: 'Sorry, there was an error saving the expense. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    } else {
      const cancelMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        content: 'No problem! Feel free to try again with different details.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, cancelMessage]);
    }
    
    setPendingConfirmation(null);
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will be handled by the global layout
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Chat Container */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-bold text-white mb-2">What can I help with?</h2>
                <p className="text-gray-400">Ask me anything about splitting expenses or managing your bills</p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type !== 'user' && (
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                  <span className="text-white text-sm font-bold">AI</span>
                </div>
              )}
              
              <div
                className={`max-w-2xl px-4 py-3 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white ml-12'
                    : message.type === 'confirmation'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                {message.type === 'confirmation' && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleConfirmation(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200"
                    >
                      ✅ Confirm
                    </button>
                    <button
                      onClick={() => handleConfirmation(false)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                )}
              </div>
              
              {message.type === 'user' && (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center ml-3 flex-shrink-0 mt-1">
                  <span className="text-white text-sm font-bold">{user.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-white text-sm font-bold">AI</span>
              </div>
              <div className="bg-gray-800 text-gray-100 px-4 py-3 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-4 relative">
          {/* Friend Suggestions */}
          {showSuggestions && friendSuggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute bottom-full left-4 right-4 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl mb-3 max-h-48 overflow-y-auto z-10"
            >
              <div className="p-3 text-xs text-blue-400 border-b border-gray-700 font-medium">
                Friend suggestions:
              </div>
              {friendSuggestions.map((friend, index) => (
                <button
                  key={friend.id}
                  onClick={() => selectFriend(friend)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-700 last:border-b-0 transition-all duration-200 ${
                    index === selectedSuggestionIndex 
                      ? 'bg-gray-700' 
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">
                        {friend.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">{friend.name}</div>
                      <div className="text-xs text-gray-400">{friend.email}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ChatGPT-style Input Box */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-3xl border border-gray-600 shadow-lg">
              <form onSubmit={handleSubmit} className="flex items-end p-4 gap-3">
                {/* Media Upload Button */}
                <button
                  type="button"
                  className="flex-shrink-0 w-10 h-10 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-full transition-all duration-200 flex items-center justify-center"
                  title="Upload media"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                {/* Text Input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Message spendsavvy..."
                    className="w-full bg-transparent text-white placeholder-gray-400 resize-none border-0 focus:outline-none focus:ring-0 py-3 px-0 text-base leading-6"
                    rows={1}
                    disabled={isTyping}
                    style={{
                      minHeight: '24px',
                      maxHeight: '200px',
                      height: 'auto'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (showSuggestions && friendSuggestions.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedSuggestionIndex(prev => 
                            prev < friendSuggestions.length - 1 ? prev + 1 : 0
                          );
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedSuggestionIndex(prev => 
                            prev > 0 ? prev - 1 : friendSuggestions.length - 1
                          );
                        } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                          e.preventDefault();
                          selectFriend(friendSuggestions[selectedSuggestionIndex]);
                          return;
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setShowSuggestions(false);
                          setSelectedSuggestionIndex(-1);
                          return;
                        }
                      }
                      
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                </div>

                {/* Voice Input Button */}
                <button
                  type="button"
                  className="flex-shrink-0 w-10 h-10 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-full transition-all duration-200 flex items-center justify-center"
                  title="Voice input"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                
                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className="flex-shrink-0 w-10 h-10 bg-white hover:bg-gray-100 disabled:bg-gray-600 disabled:cursor-not-allowed text-black disabled:text-gray-400 rounded-full transition-all duration-200 flex items-center justify-center"
                >
                  {isTyping ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
