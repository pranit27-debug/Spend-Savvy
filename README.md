# AI-Enhanced Financial Splitting Chatbot

An intelligent expense splitting application using MCP (Model Context Protocol), LLM orchestration, and Neon PostgreSQL.

## Features

- 🤖 **AI-Powered Chatbot**: Natural language processing for expense splitting
- � **Smart Friend Search**: Search by name, email, or phone number with autocomplete
- 💰 **Intelligent Splitting**: Equal or custom expense splits with real-time calculations
- 📊 **Analytics Dashboard**: Monthly, weekly, and category-wise spending insights
- 👥 **Group Management**: Create and manage expense sharing groups
- 🔔 **Real-time Notifications**: Instant notifications for new expenses and group activities
- � **Receipt Management**: Upload and store receipt photos
- 🗣️ **Voice Output**: Text-to-speech responses from the AI

## Tech Stack

- **Frontend**: Next.js 15 with React 19 and Tailwind CSS
- **Backend**: MCP (Model Context Protocol) server
- **Database**: Neon PostgreSQL (serverless)
- **AI/LLM**: MCP tools for intelligent processing
- **Voice**: Text-to-speech integration

## Quick Start

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Setup Neon Database**
   - See [NEON_SETUP.md](./NEON_SETUP.md) for detailed instructions
   - Get your connection string from [Neon Console](https://console.neon.tech/)
   - Add it to `.env.local`

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   This starts both the Next.js frontend and MCP server concurrently.

## Environment Variables

```env
# Neon Database
NEON_DATABASE_URL=postgresql://username:password@ep-xxx-xxx.aws.neon.tech/dbname?sslmode=require

# Application
NODE_ENV=development
PORT=3000
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── friends/           # Friend management pages
│   └── page.tsx           # Main dashboard
├── lib/                   # Shared utilities
│   ├── db.ts             # Neon database connection
│   ├── database-functions.ts  # Database operations
│   └── mcp-server.ts     # MCP server implementation
├── scripts/              # Build and development scripts
└── NEON_SETUP.md        # Database setup guide
```

## Features Overview

### Friend Management
- Add friends by email or phone number
- Search friends with autocomplete functionality
- View friend profiles with contact information

### Expense Splitting
- Create expenses with natural language input
- Split equally or with custom amounts
- Automatic notifications to involved friends
- Receipt upload and management

### Analytics
- Monthly/weekly spending summaries
- Category-wise expense analysis
- Friend contribution tracking
- Visual spending insights

### AI Chat Interface
- Natural language expense splitting
- Query historical spending data
- Smart categorization suggestions
- Voice and text responses

## MCP Tools Available

The application includes comprehensive MCP tools for:
- User management (add, get, search users)
- Friend management (add, list, search friends)
- Expense management (create, split, list expenses)
- Group management (create, manage group members)
- Analytics (spending by category, monthly/weekly summaries)
- Notifications (push, list, acknowledge)
- Receipt management (upload, retrieve receipts)

## Database Schema

The application uses a normalized PostgreSQL schema with tables for:
- `users` - User profiles with name, email, phone
- `friends` - Friend relationships
- `groups` - Expense sharing groups
- `expenses` - Individual expenses with categorization
- `expense_splits` - How expenses are divided
- `receipts` - Receipt file storage
- `notifications` - User notifications

## Development

### Project Structure
```
my-app/
├── app/                 # Next.js app directory
├── lib/                 # Shared utilities and MCP server
│   ├── db.ts           # Database connection and schema
│   ├── database-functions.ts  # Database operations
│   └── mcp-server.ts   # MCP server implementation
├── scripts/            # Utility scripts
└── public/             # Static assets
```

### Environment Variables

Create a `.env.local` file with:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_splitter
DB_USER=postgres
DB_PASSWORD=your_password
NODE_ENV=development
PORT=3000
```
