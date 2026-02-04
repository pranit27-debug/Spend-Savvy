import { Bot, Check, Clock, Copy, User, Volume2, VolumeX, Zap } from 'lucide-react';
import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface ChatMessage {
  id: string;
  type: "user" | "bot" | "confirmation";
  content: string;
  timestamp: Date;
  data?: any;
  metadata?: {
    billId?: string;
    billData?: any;
    analyticsData?: {
      total_spent: number;
      category?: string;
      subcategory?: string;
      timeframe?: string;
    };
    showAnalyticsChart?: boolean;
  };
}

interface EnhancedMessageProps {
  message: ChatMessage;
  user: User | null;
  onSpeak: (text: string) => void;
  onStopSpeaking: () => void;
  currentSpeech: SpeechSynthesisUtterance | null;
  isMuted: boolean;
}

export const EnhancedMessage: React.FC<EnhancedMessageProps> = ({
  message,
  user,
  onSpeak,
  onStopSpeaking,
  currentSpeech,
  isMuted
}) => {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return messageTime.toLocaleDateString();
  };

  const isBot = message.type === 'bot';
  const isUser = message.type === 'user';

  return (
    <div
      ref={messageRef}
      className={`group flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar - Bot */}
      {isBot && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-emerald-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {/* Message Container */}
      <div className={`flex flex-col max-w-3xl ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message Bubble */}
        <div
          className={`relative px-5 py-4 rounded-2xl shadow-lg transition-all duration-200 ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-12 rounded-br-md'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md'
          } ${isHovered && !isUser ? 'shadow-xl ring-2 ring-blue-500/10' : ''}`}
        >
          {/* Message Content */}
          <div className="relative">
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
                {message.content}
              </p>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="mb-3 last:mb-0 text-gray-800 dark:text-gray-200 leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900 dark:text-white bg-yellow-100 dark:bg-yellow-900/30 px-1 py-0.5 rounded" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
                        {children}
                      </strong>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold mb-4 text-gray-900 dark:text-white border-b-2 border-blue-500 pb-2 flex items-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
                        <Zap className="w-5 h-5 mr-2 text-blue-500" />
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold mb-2 text-gray-800 dark:text-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-2 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="space-y-2 mb-4 list-decimal list-inside" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="flex items-start text-gray-700 dark:text-gray-300" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span className="leading-relaxed">{children}</span>
                      </li>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code className="bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-sm border" style={{ fontFamily: 'Consolas, "Liberation Mono", Menlo, Courier, monospace' }}>
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto border border-gray-700" style={{ fontFamily: 'Consolas, "Liberation Mono", Menlo, Courier, monospace' }}>
                          {children}
                        </code>
                      );
                    },
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 italic text-gray-700 dark:text-gray-300 rounded-r-lg">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full border-collapse bg-white dark:bg-gray-800">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        {children}
                      </thead>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Action Buttons Overlay */}
          {isBot && (
            <div
              className={`absolute -top-3 right-3 flex items-center gap-1 transition-opacity duration-200 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className="p-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-600"
                title="Copy message"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Speak Button */}
              {!isMuted && (
                <button
                  onClick={() => currentSpeech ? onStopSpeaking() : onSpeak(message.content)}
                  className={`p-2 rounded-full shadow-md hover:shadow-lg transition-all duration-200 border ${
                    currentSpeech
                      ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-gray-200 dark:border-gray-600'
                  }`}
                  title={currentSpeech ? "Stop speaking" : "Read aloud"}
                >
                  {currentSpeech ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Timestamp and Status */}
        <div
          className={`flex items-center mt-2 px-2 ${
            isUser ? 'justify-end' : 'justify-start'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{formatTime(message.timestamp)}</span>
            {copied && (
              <span className="text-green-500 font-medium animate-pulse">
                Copied!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Avatar - User */}
      {isUser && user && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg ring-2 ring-blue-500/20">
            <span className="text-white text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Typing Indicator Component
export const TypingIndicator: React.FC = () => (
  <div className="flex justify-start mb-6">
    <div className="flex-shrink-0 mr-3">
      <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-emerald-500/20">
        <Bot className="w-5 h-5 text-white" />
      </div>
    </div>
    <div className="bg-white dark:bg-gray-800 px-5 py-4 rounded-2xl rounded-bl-md shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
          AI is thinking...
        </span>
      </div>
    </div>
  </div>
);