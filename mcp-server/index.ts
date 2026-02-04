#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import {
  addUser,
  getUser,
  addFriend,
  listFriends,
  searchFriends,
  createGroup,
  getGroup,
  listGroups,
  updateGroupMembers,
  addExpense,
  splitExpense,
  listExpenses,
  uploadReceipt,
  getReceipts,
  getSpendByCategory,
  getMonthlySummary,
  getFriendContributions,
  getWeeklySummary,
  getCategorySpending,
  pushNotification,
  listNotifications,
  acknowledgeNotification,
  getUserByEmail,
  getUserByPhone,
  searchAllUsers,
  createExpenseWithSplit,
} from "../lib/database-functions.js";
import { initializeDatabase } from "../lib/db.js";
import { v4 as uuidv4 } from 'uuid';

class ExpenseSplitterServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "expense-splitter-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "add_user",
            description: "Add a new user to the system",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string", description: "User's name" },
                email: { type: "string", description: "User's email" },
                phone: { type: "string", description: "User's phone number (optional)" },
                balance: { type: "number", description: "Initial balance (optional)" },
              },
              required: ["name", "email"],
            },
          },
          {
            name: "get_user",
            description: "Get user details by ID",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User ID" },
              },
              required: ["userId"],
            },
          },
          {
            name: "search_friends",
            description: "Search friends by name prefix for autocomplete",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User ID" },
                prefix: { type: "string", description: "Name prefix to search" },
              },
              required: ["userId", "prefix"],
            },
          },
          {
            name: "add_friend",
            description: "Add a friend connection between two users",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User ID" },
                friendEmail: { type: "string", description: "Friend's email (optional)" },
                friendPhone: { type: "string", description: "Friend's phone number (optional)" },
              },
              required: ["userId"],
            },
          },
          {
            name: "search_all_users",
            description: "Search all users by name, email, or phone for adding friends",
            inputSchema: {
              type: "object",
              properties: {
                searchTerm: { type: "string", description: "Search term (name, email, or phone)" },
              },
              required: ["searchTerm"],
            },
          },
          {
            name: "list_friends",
            description: "List all friends for a user",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User ID" },
              },
              required: ["userId"],
            },
          },
          {
            name: "create_expense_with_split",
            description: "Create a new expense and split it among friends",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User who paid the expense" },
                amount: { type: "number", description: "Total amount" },
                category: { type: "string", description: "Expense category (e.g., food, coffee, clothing)" },
                subcategory: { type: "string", description: "Expense subcategory" },
                description: { type: "string", description: "Expense description" },
                friendIds: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Array of friend IDs to split with" 
                },
                splitType: { 
                  type: "string", 
                  enum: ["equal", "custom"],
                  description: "How to split the expense" 
                },
              },
              required: ["userId", "amount", "category", "description", "friendIds"],
            },
          },
          {
            name: "list_expenses",
            description: "List expenses for a user with optional filters",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User ID" },
                category: { type: "string", description: "Filter by category (optional)" },
                startDate: { type: "string", description: "Start date filter (optional)" },
                endDate: { type: "string", description: "End date filter (optional)" },
              },
              required: ["userId"],
            },
          },
          {
            name: "get_spending_by_category",
            description: "Get spending analysis by category for a specific month/year",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User ID" },
                month: { type: "number", description: "Month (1-12)" },
                year: { type: "number", description: "Year" },
              },
              required: ["userId", "month", "year"],
            },
          },
          {
            name: "get_monthly_summary",
            description: "Get monthly spending summary for a user",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User ID" },
              },
              required: ["userId"],
            },
          },
          {
            name: "get_weekly_summary",
            description: "Get weekly spending summary for a user",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User ID" },
              },
              required: ["userId"],
            },
          },
          {
            name: "get_category_spending",
            description: "Get detailed spending for a specific category",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User ID" },
                category: { type: "string", description: "Category to analyze" },
                startDate: { type: "string", description: "Start date (optional)" },
                endDate: { type: "string", description: "End date (optional)" },
              },
              required: ["userId", "category"],
            },
          },
          {
            name: "create_group",
            description: "Create a new group for expense sharing",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string", description: "Group name" },
                createdBy: { type: "string", description: "User ID who creates the group" },
                members: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Array of user IDs to add to group" 
                },
              },
              required: ["name", "createdBy", "members"],
            },
          },
          {
            name: "list_groups",
            description: "List all groups for a user",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User ID" },
              },
              required: ["userId"],
            },
          },
          {
            name: "get_friend_contributions",
            description: "Get contribution analysis for a group",
            inputSchema: {
              type: "object",
              properties: {
                groupId: { type: "string", description: "Group ID" },
              },
              required: ["groupId"],
            },
          },
          {
            name: "list_notifications",
            description: "List notifications for a user",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string", description: "User ID" },
              },
              required: ["userId"],
            },
          },
          {
            name: "acknowledge_notification",
            description: "Mark a notification as read",
            inputSchema: {
              type: "object",
              properties: {
                notificationId: { type: "string", description: "Notification ID" },
              },
              required: ["notificationId"],
            },
          },
          {
            name: "upload_receipt",
            description: "Upload a receipt for an expense",
            inputSchema: {
              type: "object",
              properties: {
                expenseId: { type: "string", description: "Expense ID" },
                fileUrl: { type: "string", description: "URL of the uploaded file" },
              },
              required: ["expenseId", "fileUrl"],
            },
          },
          {
            name: "get_receipts",
            description: "Get receipts for an expense",
            inputSchema: {
              type: "object",
              properties: {
                expenseId: { type: "string", description: "Expense ID" },
              },
              required: ["expenseId"],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "add_user": {
            const { name: userName, email, phone, balance } = args as {
              name: string;
              email: string;
              phone?: string;
              balance?: number;
            };
            const userId = uuidv4();
            const user = await addUser({ id: userId, name: userName, email, phone, balance });
            return {
              content: [
                {
                  type: "text",
                  text: `User created successfully: ${JSON.stringify(user)}`,
                },
              ],
            };
          }

          case "get_user": {
            const { userId } = args as { userId: string };
            const user = await getUser(userId);
            return {
              content: [
                {
                  type: "text",
                  text: user ? JSON.stringify(user) : "User not found",
                },
              ],
            };
          }

          case "search_friends": {
            const { userId, prefix } = args as { userId: string; prefix: string };
            const friends = await searchFriends(userId, prefix);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(friends),
                },
              ],
            };
          }

          case "add_friend": {
            const { userId, friendEmail, friendPhone } = args as { 
              userId: string; 
              friendEmail?: string; 
              friendPhone?: string; 
            };
            
            let friend;
            if (friendEmail) {
              friend = await getUserByEmail(friendEmail);
            } else if (friendPhone) {
              friend = await getUserByPhone(friendPhone);
            } else {
              throw new McpError(ErrorCode.InvalidRequest, "Either email or phone must be provided");
            }
            
            if (!friend) {
              throw new McpError(ErrorCode.InvalidRequest, "Friend not found with provided contact info");
            }
            const friendship = await addFriend(userId, friend.id);
            // Add reciprocal friendship
            await addFriend(friend.id, userId);
            return {
              content: [
                {
                  type: "text",
                  text: `Friend added successfully: ${JSON.stringify(friendship)}`,
                },
              ],
            };
          }

          case "search_all_users": {
            const { searchTerm } = args as { searchTerm: string };
            const users = await searchAllUsers(searchTerm);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(users),
                },
              ],
            };
          }

          case "list_friends": {
            const { userId } = args as { userId: string };
            const friends = await listFriends(userId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(friends),
                },
              ],
            };
          }

          case "create_expense_with_split": {
            const { userId, amount, category, subcategory, description, friendIds, splitType } = args as {
              userId: string;
              amount: number;
              category: string;
              subcategory?: string;
              description: string;
              friendIds: string[];
              splitType?: 'equal' | 'custom';
            };
            const result = await createExpenseWithSplit(
              userId,
              amount,
              category,
              subcategory || '',
              description,
              friendIds,
              splitType || 'equal'
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Expense created and split successfully: ${JSON.stringify(result)}`,
                },
              ],
            };
          }

          case "list_expenses": {
            const { userId, category, startDate, endDate } = args as {
              userId: string;
              category?: string;
              startDate?: string;
              endDate?: string;
            };
            const expenses = await listExpenses(userId, { category, startDate, endDate });
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(expenses),
                },
              ],
            };
          }

          case "get_spending_by_category": {
            const { userId, month, year } = args as {
              userId: string;
              month: number;
              year: number;
            };
            const spending = await getSpendByCategory(userId, month, year);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(spending),
                },
              ],
            };
          }

          case "get_monthly_summary": {
            const { userId } = args as { userId: string };
            const summary = await getMonthlySummary(userId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(summary),
                },
              ],
            };
          }

          case "get_weekly_summary": {
            const { userId } = args as { userId: string };
            const summary = await getWeeklySummary(userId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(summary),
                },
              ],
            };
          }

          case "get_category_spending": {
            const { userId, category, startDate, endDate } = args as {
              userId: string;
              category: string;
              startDate?: string;
              endDate?: string;
            };
            const spending = await getCategorySpending(userId, category, startDate, endDate);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(spending),
                },
              ],
            };
          }

          case "create_group": {
            const { name: groupName, createdBy, members } = args as {
              name: string;
              createdBy: string;
              members: string[];
            };
            const groupId = uuidv4();
            const group = await createGroup({ id: groupId, name: groupName, createdBy });
            await updateGroupMembers(groupId, [createdBy, ...members]);
            
            // Send notifications to all members
            for (const memberId of members) {
              await pushNotification(memberId, `You have been added to group: ${groupName}`);
            }
            
            return {
              content: [
                {
                  type: "text",
                  text: `Group created successfully: ${JSON.stringify(group)}`,
                },
              ],
            };
          }

          case "list_groups": {
            const { userId } = args as { userId: string };
            const groups = await listGroups(userId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(groups),
                },
              ],
            };
          }

          case "get_friend_contributions": {
            const { groupId } = args as { groupId: string };
            const contributions = await getFriendContributions(groupId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(contributions),
                },
              ],
            };
          }

          case "list_notifications": {
            const { userId } = args as { userId: string };
            const notifications = await listNotifications(userId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(notifications),
                },
              ],
            };
          }

          case "acknowledge_notification": {
            const { notificationId } = args as { notificationId: string };
            const notification = await acknowledgeNotification(notificationId);
            return {
              content: [
                {
                  type: "text",
                  text: `Notification acknowledged: ${JSON.stringify(notification)}`,
                },
              ],
            };
          }

          case "upload_receipt": {
            const { expenseId, fileUrl } = args as { expenseId: string; fileUrl: string };
            const receipt = await uploadReceipt(expenseId, fileUrl);
            return {
              content: [
                {
                  type: "text",
                  text: `Receipt uploaded successfully: ${JSON.stringify(receipt)}`,
                },
              ],
            };
          }

          case "get_receipts": {
            const { expenseId } = args as { expenseId: string };
            const receipts = await getReceipts(expenseId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(receipts),
                },
              ],
            };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async run() {
    // Initialize database
    try {
      await initializeDatabase();
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      process.exit(1);
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("Expense Splitter MCP server running on stdio");
  }
}

const server = new ExpenseSplitterServer();
server.run().catch(console.error);
