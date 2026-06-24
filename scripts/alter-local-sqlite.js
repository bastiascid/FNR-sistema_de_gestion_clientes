const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function run() {
  const dbPath = path.resolve(__dirname, '../database.sqlite');
  console.log('Opening local SQLite database at:', dbPath);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  try {
    console.log('Checking columns and updating schema...');
    
    // Check if registrado column exists
    try {
      await db.run('ALTER TABLE movimientos ADD COLUMN registrado INTEGER DEFAULT 0');
      console.log('Added column "registrado" to movimientos table.');
    } catch (e) {
      if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
        console.log('Column "registrado" already exists.');
      } else {
        throw e;
      }
    }

    // Check if pagado column exists
    try {
      await db.run('ALTER TABLE movimientos ADD COLUMN pagado INTEGER DEFAULT 0');
      console.log('Added column "pagado" to movimientos table.');
    } catch (e) {
      if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
        console.log('Column "pagado" already exists.');
      } else {
        throw e;
      }
    }

    // Check if fecha_registrado column exists
    try {
      await db.run('ALTER TABLE movimientos ADD COLUMN fecha_registrado TEXT');
      console.log('Added column "fecha_registrado" to movimientos table.');
    } catch (e) {
      if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
        console.log('Column "fecha_registrado" already exists.');
      } else {
        throw e;
      }
    }

    // Check if fecha_pagado column exists
    try {
      await db.run('ALTER TABLE movimientos ADD COLUMN fecha_pagado TEXT');
      console.log('Added column "fecha_pagado" to movimientos table.');
    } catch (e) {
      if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
        console.log('Column "fecha_pagado" already exists.');
      } else {
        throw e;
      }
    }

    console.log('SQLite database schema updated successfully.');
  } catch (err) {
    console.error('Error updating SQLite database:', err);
  } finally {
    await db.close();
  }
}

run();
