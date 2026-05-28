import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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

    const db = await getDb();
    const clients = await db.all(query, ...params);

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

    const db = await getDb();
    const result = await db.run(
      `INSERT INTO clientes (nombre, rut, telefono, correo, direccion, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      nombre,
      rut || null,
      telefono || null,
      correo || null,
      direccion || null,
      observaciones || null
    );

    const newClient = await db.get('SELECT * FROM clientes WHERE id = ?', result.lastID);

    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
