const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const excelPath = '/Users/cristian/Desktop/FNR/ESTE SI Copia de honorarios FNR mensuales 2026.xlsm';
const dbPath = path.resolve(__dirname, '../database.sqlite');

function excelDateToJSDate(excelDate) {
  if (typeof excelDate !== 'number') return null;
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const millisecondsInADay = 24 * 60 * 60 * 1000;
  return new Date(epoch.getTime() + excelDate * millisecondsInADay);
}

function formatDate(date) {
  if (!date) return '2026-01-01'; // Default fallback date if absolutely no date is found
  return date.toISOString().split('T')[0];
}

async function migrate() {
  try {
    console.log('Opening SQLite database at:', dbPath);
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    await db.run('PRAGMA foreign_keys = ON');

    // Initialize tables if they do not exist
    console.log('Initializing database schema...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        rut TEXT,
        telefono TEXT,
        correo TEXT,
        direccion TEXT,
        observaciones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS movimientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_cliente INTEGER NOT NULL,
        fecha TEXT NOT NULL,
        detalle TEXT NOT NULL,
        banco TEXT,
        boleta TEXT,
        credito INTEGER DEFAULT 0,
        abono INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_cliente) REFERENCES clientes(id) ON DELETE CASCADE
      );
    `);

    console.log('Loading Excel workbook from:', excelPath);
    const workbook = xlsx.readFile(excelPath);
    console.log('Excel workbook loaded successfully.');

    // 1. Compile client names from ESTADO DE CUENTAS
    const ecSheet = workbook.Sheets['ESTADO DE CUENTAS'];
    const ecData = xlsx.utils.sheet_to_json(ecSheet, { header: 1 });
    const ecClients = {};
    ecData.forEach(row => {
      if (row && typeof row[0] === 'number') {
        const id = row[0];
        ecClients[id] = row[1] ? String(row[1]).trim() : '';
      }
    });

    // 2. Compile client names from BUSQUEDA
    const bSheet = workbook.Sheets['BUSQUEDA'];
    const bData = xlsx.utils.sheet_to_json(bSheet, { header: 1 });
    const bClients = {};
    bData.forEach(row => {
      if (row && typeof row[0] === 'number') {
        const id = row[0];
        bClients[id] = row[1] ? String(row[1]).trim() : '';
      }
    });

    const numSheets = workbook.SheetNames.filter(name => !isNaN(parseInt(name)));
    console.log(`Processing ${numSheets.length} client sheets...`);

    // Clear existing database tables to ensure clean seeding
    await db.run('DELETE FROM movimientos');
    await db.run('DELETE FROM clientes');
    console.log('Cleared existing data in sqlite.');

    let clientsImported = 0;
    let movementsImported = 0;

    // Track parsed sums to display comparison at the end
    let totalParsedCredits = 0;
    let totalParsedAbonos = 0;

    // Run within transaction for extreme speed
    await db.run('BEGIN TRANSACTION');

    for (let sheetName of numSheets) {
      const id = parseInt(sheetName);
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      const row1Val = data[1] && data[1][1] ? String(data[1][1]).trim() : '';
      const row8Val = data[8] && data[8][1] ? String(data[8][1]).trim() : '';
      
      // Determine final clean name based on priority
      let nombre = row8Val || row1Val || ecClients[id] || bClients[id] || '';
      
      // Clean up names if they contain template/placeholder text or are blank
      if (!nombre && id === 9) nombre = 'ARELLANO REVECO INGRID ELIANA';
      if (!nombre && id === 22) nombre = 'DR CARREÑO';
      if (!nombre && id === 54) nombre = 'MUÑOZ AGUILAR ANGELA CECILIA';
      if (!nombre && id === 75) nombre = 'RALL METALES';
      
      // Final fallback if name is still empty
      if (!nombre) {
        nombre = `Cliente ID ${id}`;
      }

      // Clean trailing spaces and formatting
      nombre = nombre.trim();

      // Insert client maintaining their exact ID from the spreadsheet
      await db.run(
        `INSERT INTO clientes (id, nombre, rut, telefono, correo, direccion, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id, nombre, null, null, null, null, null
      );
      clientsImported++;

      let currentTransactionDate = null;

      // Extract movements (Rows 12 to total row)
      for (let r = 12; r < data.length; r++) {
        const row = data[r];
        if (!row) continue;

        const dateVal = row[1];
        const detail = row[2] ? String(row[2]).trim() : '';

        // Skip total row
        if (
          dateVal === 'TOTAL' || 
          (typeof dateVal === 'string' && dateVal.trim().toUpperCase() === 'TOTAL') || 
          detail.toUpperCase() === 'TOTAL'
        ) {
          continue;
        }

        const credit = Number(row[5] || 0);
        const abono = Number(row[6] || 0);
        const banco = row[3] ? String(row[3]).trim() : null;
        const boleta = row[4] ? String(row[4]).trim() : null;

        // Propagate transaction date if serial excel date is present
        if (dateVal && typeof dateVal === 'number') {
          currentTransactionDate = excelDateToJSDate(dateVal);
        }

        // Only insert if it contains a credit, abono, date, or detail (exclude empty placeholder rows)
        if (credit > 0 || abono > 0 || (dateVal && typeof dateVal === 'number') || detail) {
          const formattedDate = formatDate(currentTransactionDate);

          // We ignore placeholder rows like "Honorarios mes Abril 2026" that have no credit and no abono
          const isRealTx = credit > 0 || abono > 0 || (detail && !detail.startsWith('Honorarios mes') && !detail.startsWith('Honorarios pagados') && !detail.startsWith('honorarios mes') && !detail.startsWith('Honor. Pagados'));
          
          if (isRealTx) {
            await db.run(
              `INSERT INTO movimientos (id_cliente, fecha, detalle, banco, boleta, credito, abono)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              id,
              formattedDate,
              detail || (credit > 0 ? 'Honorarios' : 'Pago'),
              banco,
              boleta,
              credit,
              abono
            );
            movementsImported++;
            totalParsedCredits += credit;
            totalParsedAbonos += abono;
          }
        }
      }
    }

    await db.run('COMMIT');

    console.log('\nMigration Dry-Run comparison and seeding completed successfully!');
    console.log(`- Clients imported to SQLite: ${clientsImported}`);
    console.log(`- Detailed Movements imported to SQLite: ${movementsImported}`);
    console.log(`- Total Billed (Debe) in SQLite: $${totalParsedCredits.toLocaleString('es-CL')}`);
    console.log(`- Total Received (Haber) in SQLite: $${totalParsedAbonos.toLocaleString('es-CL')}`);
    console.log(`- Total Balance (Saldo) in SQLite: $${(totalParsedCredits - totalParsedAbonos).toLocaleString('es-CL')}`);

    await db.close();
  } catch (error) {
    console.error('Migration failed with error:', error);
    process.exit(1);
  }
}

migrate();
