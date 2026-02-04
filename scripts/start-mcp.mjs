import { ExpenseSplitterServer } from '../lib/mcp-server.js';

async function startMcpServer() {
  const server = new ExpenseSplitterServer();
  
  process.on("SIGINT", async () => {
    console.log("Shutting down MCP server...");
    await server.close();
    process.exit(0);
  });

  await server.start();
}

startMcpServer().catch(console.error);
