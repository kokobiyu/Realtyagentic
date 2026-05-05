const fs = require('fs');

async function applyMigration() {
  const sql = fs.readFileSync('./supabase/migrations/001_create_tables.sql', 'utf8');
  
  const projectRef = 'ligusnjmlsfdfbwunxjy';
  const token = 'YOUR_SUPABASE_TOKEN';
  
  console.log('Sending SQL query to Supabase Management API...');
  
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Migration applied successfully!');
    console.log(data);
  } else {
    const text = await response.text();
    console.error('❌ Failed to apply migration:');
    console.error(`Status: ${response.status} ${response.statusText}`);
    console.error('Response:', text);
  }
}

applyMigration();
