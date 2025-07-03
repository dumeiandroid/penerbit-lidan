// functions/api/contacts.js - Dynamic table version with auto-create
export async function onRequest(context) {
  const { request, env } = context;
  const { DB_PENERBIT } = env;
  const method = request.method;
  const url = new URL(request.url);
  
  // Get table name from query parameter or header
  const tableName = url.searchParams.get('table') || request.headers.get('X-Table-Name') || 'contacts';
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Table-Name',
  };
  
  // Handle preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Validate table name (security check)
  if (!isValidTableName(tableName)) {
    return new Response(JSON.stringify({ 
      error: 'Invalid table name. Only alphanumeric characters and underscores allowed.' 
    }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  // Debug logging
  console.log(`API ${method} request to /api/contacts with table: ${tableName}`);
  
  try {
    switch (method) {
      case 'GET':
        return await getContacts(DB_PENERBIT, tableName, corsHeaders);
      case 'POST':
        return await createContact(request, DB_PENERBIT, tableName, corsHeaders);
      default:
        return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), { 
          status: 405, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// Security function to validate table name
function isValidTableName(tableName) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName) && tableName.length <= 50;
}

// Function to create table if not exists
async function createTableIfNotExists(DB_PENERBIT, tableName) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id_x INTEGER PRIMARY KEY AUTOINCREMENT,
      x_01 TEXT,
      x_02 TEXT,
      x_03 TEXT,
      x_04 TEXT,
      x_05 TEXT,
      x_06 TEXT,
      x_07 TEXT,
      x_08 TEXT,
      x_09 TEXT,
      x_10 TEXT,
      x_11 TEXT,
      x_12 TEXT,
      x_13 TEXT,
      x_14 TEXT,
      x_15 TEXT,
      x_16 TEXT,
      x_17 TEXT,
      x_18 TEXT,
      x_19 TEXT,
      x_20 TEXT
    )
  `;
  
  await DB_PENERBIT.prepare(createTableQuery).run();
  console.log(`Table '${tableName}' created or already exists`);
}

// GET all contacts - Dynamic table version with auto-create
async function getContacts(DB_PENERBIT, tableName, corsHeaders) {
  console.log(`Getting all data from table: ${tableName}...`);
  
  try {
    // Check if table exists first
    const tableCheck = await DB_PENERBIT.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?
    `).bind(tableName).first();
    
    if (!tableCheck) {
      console.log(`Table '${tableName}' does not exist, creating...`);
      await createTableIfNotExists(DB_PENERBIT, tableName);
    }
    
    const query = `SELECT * FROM ${tableName} ORDER BY id_x DESC`;
    const { results } = await DB_PENERBIT.prepare(query).all();
    console.log(`Found ${results.length} records in ${tableName}`);
    
    return new Response(JSON.stringify({
      success: true,
      table: tableName,
      count: results.length,
      data: results
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error(`Error getting data from ${tableName}:`, error);
    return new Response(JSON.stringify({ 
      error: `Failed to get data from table '${tableName}': ${error.message}` 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// POST create contact - Dynamic table version with auto-create
async function createContact(request, DB_PENERBIT, tableName, corsHeaders) {
  console.log(`Creating new record in table: ${tableName}...`);
  
  let requestData;
  try {
    requestData = await request.json();
    console.log('Request data:', requestData);
  } catch (error) {
    throw new Error('Invalid JSON data');
  }
  
  try {
    // Check if table exists first
    const tableCheck = await DB_PENERBIT.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?
    `).bind(tableName).first();
    
    if (!tableCheck) {
      console.log(`Table '${tableName}' does not exist, creating...`);
      await createTableIfNotExists(DB_PENERBIT, tableName);
    }
    
    // Extract data for x_01 to x_20 columns
    const columns = [];
    const values = [];
    const placeholders = [];
    
    // Generate x_01 to x_20 columns dynamically
    for (let i = 1; i <= 20; i++) {
      const colNum = i.toString().padStart(2, '0');
      const colName = `x_${colNum}`;
      
      if (requestData.hasOwnProperty(colName)) {
        columns.push(colName);
        values.push(requestData[colName]);
        placeholders.push('?');
      }
    }
    
    // Basic validation - require at least one field
    if (columns.length === 0) {
      throw new Error('At least one field (x_01 to x_20) is required');
    }
    
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    console.log('Insert query:', query);
    console.log('Values:', values);
    
    const result = await DB_PENERBIT.prepare(query).bind(...values).run();
    console.log('Insert result:', result);
    
    return new Response(JSON.stringify({ 
      success: true, 
      table: tableName,
      id_x: result.meta.last_row_id,
      message: `Record created successfully in table '${tableName}'`,
      insertedFields: columns,
      insertedData: requestData
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (dbError) {
    console.error('Database error:', dbError);
    throw new Error(`Failed to save record to table '${tableName}': ${dbError.message}`);
  }
}