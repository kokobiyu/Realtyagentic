const fs = require('fs');

async function callMcpTool() {
  const sql = fs.readFileSync('./supabase/migrations/001_create_tables.sql', 'utf8');
  const projectRef = 'ligusnjmlsfdfbwunxjy';
  const token = 'YOUR_SUPABASE_TOKEN';
  
  // JSON-RPC payload for MCP
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "apply_migration",
      arguments: {
        name: "create_conversations_and_messages",
        query: sql
      }
    }
  };

  console.log('Calling Supabase MCP tool...');
  
  try {
    const response = await fetch(`https://mcp.supabase.com/mcp?project_ref=${projectRef}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ MCP Tool executed successfully!');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.error('❌ Failed to call MCP tool:');
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error('Response:', text);
    }
  } catch (error) {
    console.error('Network Error:', error);
  }
}

callMcpTool();
