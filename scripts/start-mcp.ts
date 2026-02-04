import { config } from 'dotenv';
import { ExpenseSplitterServer } from '../lib/mcp-server.js';

// Load environment variables
config({ path: '.env.local' });

async function startMcpServer() {
  const server = new ExpenseSplitterServer();
  
  process.on("SIGINT", async () => {
    console.log("Shutting down MCP server...");
    await server.close();
    process.exit(0);
  });

  console.log("Starting MCP server...");
  await server.start();
}

startMcpServer().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
