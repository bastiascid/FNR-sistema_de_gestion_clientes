import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.FNR_DB_PATH || path.resolve(process.cwd(), 'database.sqlite');

// Initialize the database connection
const db = new Database(DB_PATH, { verbose: console.log });

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
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

export default db;
export type Client = {
  id: number;
  nombre: string;
  rut: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  observaciones: string | null;
  created_at: string;
};

export type Movement = {
  id: number;
  id_cliente: number;
  fecha: string;
  detalle: string;
  banco: string | null;
  boleta: string | null;
  credito: number;
  abono: number;
  created_at: string;
};
