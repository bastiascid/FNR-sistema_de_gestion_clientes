const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { createClient } = require('@supabase/supabase-js');

// Mock global WebSocket to prevent Supabase Realtime client crash in Node.js < 22
global.WebSocket = class {};

// Helper to load environment variables from .env.local or .env
function loadEnv() {
  const envLocalPath = path.resolve(__dirname, '../.env.local');
  const envPath = path.resolve(__dirname, '../.env');
  
  let envContent = '';
  if (fs.existsSync(envLocalPath)) {
    console.log('Loading env variables from .env.local');
    envContent = fs.readFileSync(envLocalPath, 'utf8');
  } else if (fs.existsSync(envPath)) {
    console.log('Loading env variables from .env');
    envContent = fs.readFileSync(envPath, 'utf8');
  } else {
    console.log('No .env.local or .env file found. Will use system environment variables.');
    return;
  }

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, ''); // strip optional quotes
      process.env[key] = val;
    }
  });
}

async function run() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use service role key if available, otherwise fallback to anon key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials not found.');
    console.error('Please configure NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment or .env.local');
    process.exit(1);
  }

  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });

  const dbPath = path.resolve(__dirname, '../database.sqlite');
  if (!fs.existsSync(dbPath)) {
    console.error(`Error: SQLite database not found at ${dbPath}`);
    process.exit(1);
  }

  console.log(`Opening SQLite database at: ${dbPath}`);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  try {
    // 1. Fetch and migrate clients
    console.log('Reading clients from SQLite...');
    const sqliteClients = await db.all('SELECT * FROM clientes');
    console.log(`Found ${sqliteClients.length} clients in SQLite.`);

    if (sqliteClients.length > 0) {
      // Map columns if necessary. Supabase table columns: id, nombre, rut, telefono, correo, direccion, observaciones, created_at
      const mappedClients = sqliteClients.map(c => ({
        id: c.id,
        nombre: c.nombre,
        rut: c.rut || null,
        telefono: c.telefono || null,
        correo: c.correo || null,
        direccion: c.direccion || null,
        observaciones: c.observaciones || null,
        created_at: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString()
      }));

      console.log('Uploading clients to Supabase...');
      // Batch insert / upsert clients
      // We upsert matching by 'id' to ensure correct relationships
      const { data, error } = await supabase
        .from('clientes')
        .upsert(mappedClients, { onConflict: 'id' });

      if (error) {
        console.error('Error uploading clients to Supabase:', error);
        throw error;
      }
      console.log('Successfully migrated clients.');
    }

    // 2. Fetch and migrate movements
    console.log('Reading movements from SQLite...');
    const sqliteMovements = await db.all('SELECT * FROM movimientos');
    console.log(`Found ${sqliteMovements.length} movements in SQLite.`);

    if (sqliteMovements.length > 0) {
      const mappedMovements = sqliteMovements.map(m => ({
        id: m.id,
        id_cliente: m.id_cliente,
        fecha: m.fecha, // should be YYYY-MM-DD
        detalle: m.detalle,
        banco: m.banco || null,
        boleta: m.boleta || null,
        credito: m.credito || 0,
        abono: m.abono || 0,
        created_at: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString()
      }));

      console.log('Uploading movements to Supabase in batches...');
      const batchSize = 100;
      for (let i = 0; i < mappedMovements.length; i += batchSize) {
        const batch = mappedMovements.slice(i, i + batchSize);
        console.log(`Uploading movements batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(mappedMovements.length/batchSize)}...`);
        const { error } = await supabase
          .from('movimientos')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          console.error(`Error uploading movements batch starting at index ${i}:`, error);
          throw error;
        }
      }
      console.log('Successfully migrated all movements.');
    }

    console.log('\nMigration completed successfully!');
    console.log(`Migrated: ${sqliteClients.length} clients, ${sqliteMovements.length} movements.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await db.close();
  }
}

run();
