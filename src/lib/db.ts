import { open, Database as SqliteDatabase } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';

let dbPromise: Promise<SqliteDatabase> | null = null;

export async function getDb(): Promise<SqliteDatabase> {
  if (!dbPromise) {
    const DB_PATH = process.env.FNR_DB_PATH || path.resolve(process.cwd(), 'database.sqlite');
    
    dbPromise = open({
      filename: DB_PATH,
      driver: sqlite3.Database
    }).then(async (db) => {
      // Enable foreign key constraints
      await db.run('PRAGMA foreign_keys = ON');

      // Initialize tables
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
      return db;
    });
  }
  return dbPromise;
}

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
