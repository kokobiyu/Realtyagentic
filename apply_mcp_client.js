const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const fs = require('fs');

async function main() {
  const projectRef = 'ligusnjmlsfdfbwunxjy';
  const token = 'YOUR_SUPABASE_TOKEN';
  const sql = fs.readFileSync('./supabase/migrations/001_create_tables.sql', 'utf8');

  // Initialize transport
  const url = new URL(`https://mcp.supabase.com/mcp?project_ref=${projectRef}`);
  const transport = new SSEClientTransport(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const client = new Client({
    name: "supabase-mcp-client",
    version: "1.0.0",
  }, {
    capabilities: {}
  });

  try {
    console.log("Connecting to Supabase MCP server...");
    await client.connect(transport);
    console.log("✅ Connected!");

    console.log("Calling tool: apply_migration...");
    const result = await client.callTool({
      name: "apply_migration",
      arguments: {
        name: "create_conversations_and_messages",
        query: sql
      }
    });

    console.log("✅ Migration result:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Error executing tool:", error);
  } finally {
    // Graceful exit
    setTimeout(() => process.exit(0), 1000);
  }
}

main();
