import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = `
      SELECT c.*,
             COALESCE(SUM(m.credito), 0) AS debe,
             COALESCE(SUM(m.abono), 0) AS haber,
             COALESCE(SUM(m.credito), 0) - COALESCE(SUM(m.abono), 0) AS saldo
      FROM clientes c
      LEFT JOIN movimientos m ON c.id = m.id_cliente
    `;

    const params: any[] = [];

    if (search) {
      query += ` WHERE c.nombre LIKE ? OR c.rut LIKE ? `;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += `
      GROUP BY c.id
      ORDER BY c.nombre ASC
    `;

    const stmt = db.prepare(query);
    const clients = stmt.all(...params);

    return NextResponse.json(clients);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, rut, telefono, correo, direccion, observaciones } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const stmt = db.prepare(`
      INSERT INTO clientes (nombre, rut, telefono, correo, direccion, observaciones)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      nombre,
      rut || null,
      telefono || null,
      correo || null,
      direccion || null,
      observaciones || null
    );

    const newClient = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
