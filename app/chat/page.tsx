"use client";

import { ExpenseConfirmation } from "@/components/chats/ConfirmationMessage";
import { EnhancedMessage, TypingIndicator } from '@/components/chats/EnhancedMessages';
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";


// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: ((event: any) => void) | null;
  onstart: ((event: any) => void) | null;
}

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

interface ParsedExpense {
  description: string;
  amount?: number;
  totalAmount?: number;
  category: string;
  subcategory?: string;
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
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);
  const [isProcessingBill, setIsProcessingBill] = useState(false);

  // Autocomplete states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [friendSuggestions, setFriendSuggestions] = useState<Friend[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Voice functionality state
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null
  );
  const [currentSpeech, setCurrentSpeech] =
    useState<SpeechSynthesisUtterance | null>(null);

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatList, setChatList] = useState<any[]>([]);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Check authentication on component mount
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/signin");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsLoading(false);

      // Add welcome message
      setMessages([
        {
          id: "1",
          type: "bot" as "bot",
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
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Error parsing user data:", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      router.push("/signin");
    }
  }, [router]);

  // Check voice feature compatibility
  const isVoiceSupported = () => {
    if (typeof window === "undefined") return false;
    const hasSpeechRecognition =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    const hasSpeechSynthesis = "speechSynthesis" in window;
    return hasSpeechRecognition && hasSpeechSynthesis;
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize voice recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsRecording(false);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        setRecognition(recognition);
      } else {
        setIsVoiceEnabled(false);
        console.warn("Speech recognition not supported in this browser");
      }
    }
  }, []);

  // Search friends for autocomplete
  const searchFriends = useCallback(
    async (query: string) => {
      if (!user || !query.trim() || query.length < 2) {
        setFriendSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        return;
      }

      try {
        const response = await fetch(
          `/api/friends/search?userId=${user.id}&query=${encodeURIComponent(
            query
          )}`
        );
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            setFriendSuggestions(data.friends || []);
            setShowSuggestions(data.friends?.length > 0);
            setSelectedSuggestionIndex(-1); // Reset selection
          } else {
            console.error("Non-JSON response from friends search API");
            setShowSuggestions(false);
            setSelectedSuggestionIndex(-1);
          }
        } else {
          console.error(
            "Friends search API error:",
            response.status,
            response.statusText
          );
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        }
      } catch (error) {
        console.error("Error searching friends:", error);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    },
    [user]
  );

  // Handle input changes and detect when user is typing a name
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;

    setInputValue(value);
    setCursorPosition(position);

    // Find the current word being typed
    const textBeforeCursor = value.substring(0, position);
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1] || "";

    setCurrentWord(currentWord);

    // Trigger friend search if the word looks like a name (starts with capital or has @ symbol)
    // Also trigger on words after "with", "and", or common splitting phrases
    const triggerWords = ["with", "and", "split", "share", "divide"];
    const textLower = textBeforeCursor.toLowerCase();
    const shouldTrigger =
      currentWord.length >= 2 &&
      (/^[A-Z]/.test(currentWord) ||
        currentWord.includes("@") ||
        triggerWords.some((word) => textLower.includes(word + " ")) ||
        /\b(with|and)\s+\w*$/i.test(textBeforeCursor));

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
    const newText = words.join(" ") + " " + textAfterCursor;

    setInputValue(newText);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    // Focus back on input and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        const newPosition = words.join(" ").length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Handle bill upload
  const handleBillUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsProcessingBill(true);

    // Add processing message
    addBotMessage(
      `📄 Processing your bill: **${file.name}**\n\n⏳ I'm analyzing the receipt and extracting expense details. This may take a few seconds...`
    );

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user.id);

      const response = await fetch("/api/ocr/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      // Handle duplicate bills
      if (data.isDuplicate) {
        addBotMessage(
          `🔍 **Duplicate Bill Detected!**\n\n📄 **Bill Details:**\n• Merchant: ${
            data.billData.merchantName || "Unknown"
          }\n• Amount: $${data.billData.totalAmount || 0}\n• Original Upload: ${
            data.existingBill?.filename || "N/A"
          }\n\n💡 **This bill has already been uploaded before.** You can still create a new expense split if needed.\n\n💬 **Ready to split?** Type something like:\n"Split this $${
            data.billData.totalAmount || 0
          } expense with [friend names]"`,
          undefined,
          {
            billId: data.billId,
            billData: data.billData,
          }
        );

        // Auto-suggest splitting with duplicate warning
        setTimeout(() => {
          setInputValue(
            `Split this $${data.billData.totalAmount || 0} expense from ${
              data.billData.merchantName || "this merchant"
            } with `
          );
          if (inputRef.current) {
            inputRef.current.focus();
            const length = inputRef.current.value.length;
            inputRef.current.setSelectionRange(length, length);
          }
        }, 1000);

        return;
      }

      // Handle similar bills
      if (data.isSimilar) {
        addBotMessage(
          `⚠️ **Similar Bill Found!**\n\n📄 **Bill Details:**\n• Merchant: ${
            data.billData.merchantName || "Unknown"
          }\n• Amount: $${data.billData.totalAmount || 0}\n• Similar Bill: ${
            data.similarBill?.filename || "N/A"
          }\n\n💡 **A similar bill was found within the last 7 days.** This might be the same expense. Using the existing bill to avoid duplicates.\n\n💬 **Ready to split?** Type something like:\n"Split this $${
            data.billData.totalAmount || 0
          } expense with [friend names]"`,
          undefined,
          {
            billId: data.billId,
            billData: data.billData,
          }
        );

        // Auto-suggest splitting with similar warning
        setTimeout(() => {
          setInputValue(
            `Split this $${data.billData.totalAmount || 0} expense from ${
              data.billData.merchantName || "this merchant"
            } with `
          );
          if (inputRef.current) {
            inputRef.current.focus();
            const length = inputRef.current.value.length;
            inputRef.current.setSelectionRange(length, length);
          }
        }, 1000);

        return;
      }

      // Create expense details message for new bills
      addBotMessage(
        `✅ **Bill processed successfully!**\n\n📋 **Expense Details:**\n• Merchant: ${
          data.billData.merchantName || "Unknown"
        }\n• Total Amount: $${data.billData.totalAmount || 0}\n• Date: ${
          data.billData.date || "Not specified"
        }\n• Items: ${
          data.billData.items?.length || 0
        } items found\n• Confidence: ${Math.round(
          (data.confidence || 0) * 100
        )}%\n\n💬 **Ready to split?** Just type something like:\n"Split this $${
          data.billData.totalAmount || 0
        } expense with [friend names]"`,
        undefined,
        {
          billId: data.billId,
          billData: data.billData,
        }
      );

      // Auto-suggest splitting
      setTimeout(() => {
        setInputValue(
          `Split this $${data.billData.totalAmount || 0} expense from ${
            data.billData.merchantName || "this merchant"
          } with `
        );
        if (inputRef.current) {
          inputRef.current.focus();
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
        }
      }, 1000);
    } catch (error) {
      console.error("Bill upload error:", error);

      addBotMessage(
        `❌ **Failed to process bill**\n\nSorry, I couldn't process your receipt. Please try:\n• Using a clearer image\n• Making sure the text is readable\n• Uploading a different format (JPG, PNG, PDF)\n\nYou can also manually type the expense details instead!`
      );
    } finally {
      setIsProcessingBill(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Voice functionality
  const startRecording = () => {
    if (recognition && isVoiceEnabled) {
      setIsRecording(true);
      try {
        recognition.start();
      } catch (error) {
        console.error("Failed to start recording:", error);
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (recognition && isRecording) {
      recognition.stop();
      setIsRecording(false);
    }
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window && !isMuted) {
      try {
        // Stop any current speech
        window.speechSynthesis.cancel();

        // Clean the text for better speech
        const cleanText = text
          .replace(/[💡📋•✅❌⚠️🔍]/g, "") // Remove emojis
          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove markdown bold
          .replace(/\n/g, ". ") // Replace newlines with pauses
          .replace(/\$\d+(\.\d{2})?/g, "$& dollars") // Make currency readable
          .trim();

        // Don't attempt to speak empty text
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        // Function to set voice after voices are loaded
        const setVoice = () => {
          try {
            const voices = window.speechSynthesis.getVoices();

            if (voices.length > 0) {
              const preferredVoice = voices.find(
                (voice) =>
                  voice.name.includes("Google") ||
                  voice.name.includes("Microsoft") ||
                  voice.lang.startsWith("en")
              );

              if (preferredVoice) {
                utterance.voice = preferredVoice;
              } else {
                utterance.voice = voices[0];
              }
            }
          } catch (voiceError) {
            console.warn("Voice selection error:", voiceError);
            // Continue without specific voice
          }
        };

        // Set voice immediately if voices are available
        if (window.speechSynthesis.getVoices().length > 0) {
          setVoice();
        } else {
          // Wait for voices to load with timeout
          const voicesTimeout = setTimeout(() => {
            window.speechSynthesis.onvoiceschanged = null;
          }, 3000);

          window.speechSynthesis.onvoiceschanged = () => {
            clearTimeout(voicesTimeout);
            setVoice();
            window.speechSynthesis.onvoiceschanged = null;
          };
        }

        utterance.onstart = () => {
          setCurrentSpeech(utterance);
        };

        utterance.onend = () => {
          setCurrentSpeech(null);
        };

        utterance.onerror = (event) => {
          console.warn(
            "Speech synthesis error:",
            event.error || "Unknown error"
          );
          setCurrentSpeech(null);

          // Try to recover by clearing the speech queue
          try {
            window.speechSynthesis.cancel();
          } catch (cancelError) {
            console.warn("Error cancelling speech:", cancelError);
          }
        };

        // Set current speech before starting
        setCurrentSpeech(utterance);

        // Use a small delay to ensure proper initialization
        setTimeout(() => {
          try {
            window.speechSynthesis.speak(utterance);
          } catch (speakError) {
            console.warn("Error starting speech:", speakError);
            setCurrentSpeech(null);
          }
        }, 100);
      } catch (error) {
        console.warn("Speech synthesis setup error:", error);
        setCurrentSpeech(null);
      }
    }
  };

  const stopSpeaking = () => {
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch (error) {
      console.warn("Error stopping speech:", error);
    } finally {
      setCurrentSpeech(null);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      stopSpeaking();
    }
  };

  // Helper function to add bot message and speak it
  const addBotMessage = (content: string, data?: any, metadata?: any) => {
    const botMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "bot",
      content,
      timestamp: new Date(),
      ...(data && { data }),
      ...(metadata && { metadata }),
    };
    setMessages((prev) => {
      const updated = [...prev, botMessage];
      // Save updated history to backend (including bot messages)
      if (chatId && user) {
        fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, history: updated, chatId, title: updated[0]?.content.slice(0, 40) }),
        });
      }
      return updated;
    });

    // Speak the message if not muted
    if (!isMuted) {
      setTimeout(() => speakText(content), 100); // Small delay to ensure message is rendered
    }

    return botMessage;
  };

  // Check if it's the first message from the bot
  const isFirstBotMessage = (messages: ChatMessage[]) => {
    if (messages.length === 0) return true;
    const lastMessage = messages[messages.length - 1];
    return lastMessage.type === "user" && lastMessage.content.startsWith("Hi ");
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      // Save updated history to backend
      if (chatId) {
        fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, history: updated, chatId, title: updated[0]?.content.slice(0, 40) }),
        });
      }
      return updated;
    });
    setInputValue("");
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      // Get recent conversation history (last 10 messages for context)
      const recentMessages = messages.slice(-10).map((msg) => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      const response = await fetch("/api/chat/enhanced", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          userId: user.id,
          conversationHistory: recentMessages,
          pendingConfirmation: pendingConfirmation, // Include any pending confirmation
        }),
      });

      let data;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // Handle non-JSON responses (like HTML error pages)
        const textResponse = await response.text();
        console.error("Non-JSON response from parse API:", textResponse);
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`
        );
      }

      if (data.success) {
        if (data.type === "expense_split" && data.expense) {
          // Handle expense splitting
          const expense = data.expense as ParsedExpense;

          const confirmationContent = `💡 ${
            expense.reasoning || "Expense splitting details"
          }\n\n📋 **Expense Details:**\n• Description: ${
            expense.description
          }\n• Amount: $${expense.totalAmount || expense.amount}\n• Category: ${
            expense.category
          }${
            expense.subcategory ? `\n• Subcategory: ${expense.subcategory}` : ""
          }\n• Splitting with: ${
            expense.splits?.map((s: any) => s.userName).join(", ") ||
            expense.allParticipants?.map((p: any) => p.name).join(", ") ||
            "No participants"
          }\n\nDoes this look correct?`;

          const confirmationMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: "confirmation",
            content: confirmationContent,
            timestamp: new Date(),
            data: expense,
          };
          setMessages((prev) => [...prev, confirmationMessage]);
          setPendingConfirmation(expense);

          // Also speak the confirmation message
          if (!isMuted) {
            setTimeout(() => speakText(confirmationContent), 100);
          }
        } else if (data.type === "analytics") {
          // Handle analytics queries
          setIsTyping(true);
          try {
            const analyticsResponse = await fetch(
              `/api/analytics?userId=${encodeURIComponent(
                user.id
              )}&type=${encodeURIComponent(
                data.data.type
              )}&timeframe=${encodeURIComponent(
                data.data.timeframe
              )}&category=${encodeURIComponent(
                data.data.category || ""
              )}&subcategory=${encodeURIComponent(
                data.data.subcategory || ""
              )}&friendId=${encodeURIComponent(data.data.friend || "")}`
            );

            if (analyticsResponse.ok) {
              const analyticsData = await analyticsResponse.json();

              let botContent = `📊 **${data.intent}**\n\n`;

              switch (data.data.type) {
                case "total_spent":
                  const timeframeText = data.data.timeframe
                    ? data.data.timeframe.replace("_", " ")
                    : "overall";

                  // Simplified text content - just the essential info
                  botContent += `📊 **Spending Analysis**\n\n`;
                  botContent += `Here's your spending breakdown:`;

                  // Add the message with analytics data for visual display
                  addBotMessage(botContent, undefined, {
                    analyticsData: {
                      total_spent: analyticsData.data.total_spent,
                      category: data.data.category,
                      subcategory: data.data.subcategory,
                      timeframe: timeframeText,
                    },
                  });
                  return;
                  break;
                case "category_breakdown":
                  const categoryTimeframe = data.data.timeframe
                    ? data.data.timeframe.replace("_", " ")
                    : "overall";
                  botContent += `📋 **Spending by category** (${categoryTimeframe}):\n\n`;
                  analyticsData.data.categories.forEach((cat: any) => {
                    botContent += `• ${cat.category}: $${cat.amount.toFixed(
                      2
                    )} (${cat.count} expenses)\n`;
                  });
                  break;
                case "friend_expenses":
                  const friendTimeframe = data.data.timeframe
                    ? data.data.timeframe.replace("_", " ")
                    : "overall";
                  botContent += `👥 **Expenses with friends** (${friendTimeframe}):\n\n`;
                  analyticsData.data.friend_expenses.forEach((friend: any) => {
                    botContent += `• ${
                      friend.friend_name
                    }: $${friend.total_amount.toFixed(2)} (${
                      friend.expense_count
                    } expenses)\n`;
                  });
                  break;
              }

              addBotMessage(botContent);
            } else {
              throw new Error("Analytics API error");
            }
          } catch (error) {
            const errorMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              type: "bot",
              content: `❌ Sorry, I had trouble getting your analytics data. Please try again.`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
          } finally {
            setIsTyping(false);
          }
        } else if (data.type === "expense_history") {
          // Handle expense history queries
          setIsTyping(true);
          try {
            const historyResponse = await fetch(
              `/api/expenses/history?userId=${user.id}&timeframe=${
                data.data.timeframe
              }&category=${data.data.category || ""}&friendId=${
                data.data.friend || ""
              }&limit=${data.data.limit || 10}`
            );
            if (historyResponse.ok) {
              const historyData = await historyResponse.json();
              let botContent = `📜 **${data.intent}**\n\n`;

              if (historyData.expenses.length === 0) {
                botContent += "No expenses found for the specified criteria.";
              } else {
                historyData.expenses.forEach((expense: any, index: number) => {
                  const date = new Date(
                    expense.created_at
                  ).toLocaleDateString();
                  botContent += `${index + 1}. **${
                    expense.description
                  }** - $${expense.user_amount.toFixed(2)} (${date})\n`;
                  botContent += `   Category: ${
                    expense.category
                  }, Total: ${expense.total_amount.toFixed(2)}\n\n`;
                });
              }

              addBotMessage(botContent);
            } else {
              throw new Error("Failed to fetch expense history");
            }
          } catch (error) {
            addBotMessage(
              "❌ Sorry, I had trouble getting your expense history. Please try again."
            );
          } finally {
            setIsTyping(false);
          }
        } else {
          // Handle general chat responses
          addBotMessage(data.message || data.intent);
        }
      } else if (data.error === "friends_not_found") {
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
            botContent += `   ... and ${
              data.availableFriends.length - 5
            } more\n`;
          }
        }

        botContent += `\n💭 **Tip:** Start typing a friend's name and I'll show suggestions!`;

        addBotMessage(botContent);
      } else {
        addBotMessage(
          data.message ||
            "I didn't understand that as an expense splitting request. Try something like 'Split $50 for dinner with John and Mary'"
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      addBotMessage("Sorry, I encountered an error. Please try again.");
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
        const response = await fetch("/api/expenses/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            expense: pendingConfirmation,
          }),
        });

        let data;
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          // Handle non-JSON responses
          throw new Error(`Server returned ${response.status}`);
        }

        if (response.ok && data.success) {
          const successContent = `✅ Expense split successfully! Here's how it was divided:\n\n${data.splits
  .map(
    (split: any) =>
      `• ${split.userName}: ${split.amount} (${split.percentage}%)`
  )
  .join("\n")}\n\n💾 The expense has been saved to your records.`;

          addBotMessage(successContent);
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error("Error creating expense:", error);
        addBotMessage(
          "Sorry, there was an error saving the expense. Please try again."
        );
      } finally {
        setIsTyping(false);
      }
    } else {
      addBotMessage(
        "No problem! Feel free to try again with different details."
      );
    }

    setPendingConfirmation(null);
  };

  // Load chat list and set initial chatId only after chat list is loaded
  useEffect(() => {
    if (!user) return;
    let didSetInitial = false;
    const loadChatList = async () => {
      try {
        const res = await fetch(`/api/chat/history?userId=${user.id}&list=true`);
        if (res.ok) {
          const data = await res.json();
          setChatList(data.chats || []);
          // Only set initial chatId after chat list is loaded
          if (!didSetInitial) {
            if (data.chats && data.chats.length > 0) {
              setChatId(data.chats[0].id);
            } else {
              // Create a new chat and save it to Redis immediately
              const newId = uuidv4();
              setChatId(newId);
              const welcomeMsg = {
                id: "1",
                type: "bot" as "bot",
                content: `Hi ${user.name}! 👋 I'm your AI expense splitting assistant.\n\n💬 **How to use me:**\n• Just type naturally: "Split $50 for dinner with John and Mary"\n• I'll understand amounts, categories, and friend names\n• Start typing a friend's name and I'll show suggestions\n• Use ↑↓ arrows to navigate suggestions, Enter to select\n\n🚀 **Examples:**\n• "I paid $25 for coffee with Sarah"\n• "Split the $120 Uber ride with John, Mike, and Lisa"\n• "Dinner at pizza place cost $80, split with my roommates"\n\nTry it now! What expense would you like to split?`,
                timestamp: new Date(),
              };
              setMessages([welcomeMsg]);
              await fetch("/api/chat/history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, history: [welcomeMsg], chatId: newId, title: welcomeMsg.content.slice(0, 40) }),
              });
              // Refresh chat list after creating new chat
              const res2 = await fetch(`/api/chat/history?userId=${user.id}&list=true`);
              if (res2.ok) {
                const data2 = await res2.json();
                setChatList(data2.chats || []);
              }
            }
            didSetInitial = true;
          }
        }
      } catch {}
    };
    loadChatList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load chat history for selected chatId
  useEffect(() => {
    if (!user) return;
    if (!chatId) return;
    const loadChat = async () => {
      try {
        const res = await fetch(`/api/chat/history?userId=${user.id}&chatId=${chatId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(
            Array.isArray(data.history) && data.history.length > 0
              ? data.history
              : [
                  {
                    id: "1",
                    type: "bot",
                    content: `Hi ${user.name}! 👋 I'm your AI expense splitting assistant.\n\n💬 **How to use me:**\n• Just type naturally: "Split $50 for dinner with John and Mary"\n• I'll understand amounts, categories, and friend names\n• Start typing a friend's name and I'll show suggestions\n• Use ↑↓ arrows to navigate suggestions, Enter to select\n\n🚀 **Examples:**\n• "I paid $25 for coffee with Sarah"\n• "Split the $120 Uber ride with John, Mike, and Lisa"\n• "Dinner at pizza place cost $80, split with my roommates"\n\nTry it now! What expense would you like to split?`,
                    timestamp: new Date(),
                  },
                ]
          );
        }
      } catch {}
    };
    loadChat();
  }, [user, chatId]);

  // When switching to a chat, always load its messages from backend
  const handleSelectChat = async (id: string) => {
    if (!user) return;
    setChatId(id);
    const res = await fetch(`/api/chat/history?userId=${user.id}&chatId=${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(
        Array.isArray(data.history) && data.history.length > 0
          ? data.history
          : [
              {
                id: "1",
                type: "bot",
                content: `Hi ${user.name}! 👋 I'm your AI expense splitting assistant.\n\n💬 **How to use me:**\n• Just type naturally: "Split $50 for dinner with John and Mary"\n• I'll understand amounts, categories, and friend names\n• Start typing a friend's name and I'll show suggestions\n• Use ↑↓ arrows to navigate suggestions, Enter to select\n\n🚀 **Examples:**\n• "I paid $25 for coffee with Sarah"\n• "Split the $120 Uber ride with John, Mike, and Lisa"\n• "Dinner at pizza place cost $80, split with my roommates"\n\nTry it now! What expense would you like to split?`,
                timestamp: new Date(),
              },
            ]
      );
    }
    // Refresh chat list in case it changed
    const res2 = await fetch(`/api/chat/history?userId=${user.id}&list=true`);
    if (res2.ok) {
      const data2 = await res2.json();
      setChatList(data2.chats || []);
    }
  };

  // Start a new chat
  const handleNewChat = async () => {
    if (!user) return;
    const newId = uuidv4();
    setChatId(newId);
    const welcomeMsg = {
      id: "1",
      type: "bot" as "bot",
      content: `Hi ${user.name}! 👋 I'm your AI expense splitting assistant.\n\n💬 **How to use me:**\n• Just type naturally: "Split $50 for dinner with John and Mary"\n• I'll understand amounts, categories, and friend names\n• Start typing a friend's name and I'll show suggestions\n• Use ↑↓ arrows to navigate suggestions, Enter to select\n\n🚀 **Examples:**\n• "I paid $25 for coffee with Sarah"\n• "Split the $120 Uber ride with John, Mike, and Lisa"\n• "Dinner at pizza place cost $80, split with my roommates"\n\nTry it now! What expense would you like to split?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);
    // Save new chat to Redis
    await fetch("/api/chat/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, history: [welcomeMsg], chatId: newId, title: welcomeMsg.content.slice(0, 40) }),
    });
    // Refresh chat list
    const res = await fetch(`/api/chat/history?userId=${user.id}&list=true`);
    if (res.ok) {
      const data = await res.json();
      setChatList(data.chats || []);
    }
  };

  // Rename chat handler
  const handleRenameChat = async (chatId: string, newTitle: string) => {
    if (!user) return;
    await fetch("/api/chat/history", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, chatId, title: newTitle }),
    });
    setRenamingChatId(null);
    setRenameValue("");
    // Refresh chat list
    const res = await fetch(`/api/chat/history?userId=${user.id}&list=true`);
    if (res.ok) {
      const data = await res.json();
      setChatList(data.chats || []);
    }
  };

  // Delete chat handler
  const handleDeleteChat = async (chatId: string) => {
    if (!user) return;
    if (!window.confirm("Delete this chat? This cannot be undone.")) return;
    await fetch("/api/chat/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, chatId }),
    });
    // If deleted chat is current, switch to another
    if (chatId === chatId) {
      const newList = chatList.filter((c) => c.id !== chatId);
      setChatList(newList);
      if (newList[0]?.id) {
        handleSelectChat(newList[0].id);
      } else {
        setChatId(null);
        setMessages([]);
      }
    }
    // Refresh chat list
    const res = await fetch(`/api/chat/history?userId=${user.id}&list=true`);
    if (res.ok) {
      const data = await res.json();
      setChatList(data.chats || []);
    }
  };

  // New layout structure: Fixed height container with right sidebar
  return (
    <div className="h-screen flex flex-row bg-gray-900 overflow-hidden">
      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages Container - Scrollable area above input */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto w-full p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    What can I help with?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Ask me anything about splitting expenses or managing your bills
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => {
              if (message.type === "confirmation") {
                return (
                  <ExpenseConfirmation
                    key={message.id}
                    data={message.data}
                    onConfirm={(confirmed) => handleConfirmation(confirmed)}
                    onCancel={(confirmed) => handleConfirmation(confirmed)}
                  />
                );
              }
              return (
                <EnhancedMessage
                  key={message.id}
                  message={message}
                  user={user}
                  onSpeak={speakText}
                  onStopSpeaking={stopSpeaking}
                  currentSpeech={currentSpeech}
                  isMuted={isMuted}
                />
              );
            })}
            
            {isTyping && <TypingIndicator />}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Fixed Input Area at Bottom */}
        <div className="border-t border-gray-700 p-4 bg-gray-900 relative">
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
                      ? "bg-gray-700"
                      : "hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">
                        {friend.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">
                        {friend.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {friend.email}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Input Container */}
          <div className="max-w-4xl mx-auto">
            {/* Voice Recording Indicator */}
            {isRecording && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-700 font-medium">
                  Listening... Speak now
                </span>
                <div className="flex gap-1 ml-auto">
                  <div
                    className="w-1 h-8 bg-red-400 rounded animate-pulse"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-1 h-6 bg-red-400 rounded animate-pulse"
                    style={{ animationDelay: "100ms" }}
                  ></div>
                  <div
                    className="w-1 h-10 bg-red-400 rounded animate-pulse"
                    style={{ animationDelay: "200ms" }}
                  ></div>
                  <div
                    className="w-1 h-4 bg-red-400 rounded animate-pulse"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                  <div
                    className="w-1 h-7 bg-red-400 rounded animate-pulse"
                    style={{ animationDelay: "400ms" }}
                  ></div>
                </div>
              </div>
            )}

            {/* Speaking Indicator */}
            {currentSpeech && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-700 font-medium">
                  🔊 AI is speaking...
                </span>
                <button
                  onClick={stopSpeaking}
                  className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                >
                  Stop
                </button>
              </div>
            )}

            <div className="bg-gray-800/90 backdrop-blur-lg rounded-full border-2 border-violet-500/50 shadow-2xl shadow-violet-500/20 hover:border-violet-400/70 hover:shadow-violet-400/30 transition-all duration-300">
              <form
                onSubmit={handleSubmit}
                className="flex items-center p-4 gap-3"
              >
                {/* Media Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingBill || isTyping}
                  className={`flex-shrink-0 w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center ${
                    isProcessingBill
                      ? "bg-yellow-600 text-white cursor-not-allowed"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white"
                  }`}
                  title={
                    isProcessingBill
                      ? "Processing bill..."
                      : "Upload bill/receipt"
                  }
                >
                  {isProcessingBill ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  )}
                </button>

                {/* Text Input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Message spendsavvy..."
                    className="w-full bg-transparent text-white placeholder-gray-400 resize-none border-0 focus:outline-none focus:ring-0 py-2 px-0 text-base leading-6"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}
                    rows={1}
                    disabled={isTyping}
                    style={{
                      minHeight: "24px",
                      maxHeight: "200px",
                      height: "auto",
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height =
                        Math.min(target.scrollHeight, 200) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (showSuggestions && friendSuggestions.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setSelectedSuggestionIndex((prev) =>
                            prev < friendSuggestions.length - 1 ? prev + 1 : 0
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setSelectedSuggestionIndex((prev) =>
                            prev > 0 ? prev - 1 : friendSuggestions.length - 1
                          );
                        } else if (
                          e.key === "Enter" &&
                          selectedSuggestionIndex >= 0
                        ) {
                          e.preventDefault();
                          selectFriend(
                            friendSuggestions[selectedSuggestionIndex]
                          );
                          return;
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setShowSuggestions(false);
                          setSelectedSuggestionIndex(-1);
                          return;
                        }
                      }

                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                </div>

                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTyping || !isVoiceSupported()}
                  className={`flex-shrink-0 w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center ${
                    !isVoiceSupported()
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : isRecording
                      ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white"
                  } ${isTyping ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={
                    !isVoiceSupported()
                      ? "Voice input not supported in this browser"
                      : isRecording
                      ? "Stop recording"
                      : "Start voice input"
                  }
                >
                  {isRecording ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  )}
                </button>

                {/* Mute Voice Responses Button */}
                <button
                  type="button"
                  onClick={toggleMute}
                  disabled={!isVoiceSupported()}
                  className={`flex-shrink-0 w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center ${
                    !isVoiceSupported()
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : isMuted
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white"
                  }`}
                  title={
                    !isVoiceSupported()
                      ? "Voice responses not supported in this browser"
                      : isMuted
                      ? "Unmute voice responses"
                      : "Mute voice responses"
                  }
                >
                  {isMuted ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="m17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                    </svg>
                  )}
                </button>

                {/* Stop Speaking Button */}
                <button
                  type="button"
                  onClick={stopSpeaking}
                  disabled={!currentSpeech}
                  className={`flex-shrink-0 w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center ${
                    currentSpeech
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-gray-700 opacity-50 cursor-not-allowed text-gray-400"
                  }`}
                  title={currentSpeech ? "Stop speaking" : "No speech active"}
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
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
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar for Chat List */}
      <div className="w-64 bg-gray-800 border-l border-gray-700 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-bold text-white">Chats</span>
          <button
            onClick={handleNewChat}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            title="Start new chat"
          >
            + New
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          {chatList.length === 0 && (
            <div className="text-gray-400 text-sm">No previous chats</div>
          )}
          {chatList.map((chat) => (
            <div key={chat.id} className="relative group">
              {renamingChatId === chat.id ? (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleRenameChat(chat.id, renameValue.trim() || chat.title);
                  }}
                  className="flex flex-col gap-2"
                >
                  <input
                    className="flex-1 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none text-sm"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    autoFocus
                    maxLength={40}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="text-blue-400 hover:text-blue-200 text-xs px-2 py-1 bg-gray-700 rounded">Save</button>
                    <button type="button" className="text-gray-400 hover:text-gray-200 text-xs px-2 py-1 bg-gray-700 rounded" onClick={() => setRenamingChatId(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div
                  onClick={() => handleSelectChat(chat.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 cursor-pointer ${chatId === chat.id ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate mb-1">{chat.title}</div>
                      <div className="text-xs text-gray-400">{new Date(chat.lastUpdated).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <button
                        type="button"
                        className="text-xs text-yellow-400 hover:text-yellow-200 p-1"
                        title="Rename"
                        onClick={e => { e.stopPropagation(); setRenamingChatId(chat.id); setRenameValue(chat.title); }}
                      >✏️</button>
                      <button
                        type="button"
                        className="text-xs text-red-400 hover:text-red-200 p-1"
                        title="Delete"
                        onClick={e => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                      >🗑️</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleBillUpload}
        accept="image/*,.pdf"
        className="hidden"
      />
    </div>
  );
}