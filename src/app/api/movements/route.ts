import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = `
      SELECT m.*, c.nombre AS cliente_nombre
      FROM movimientos m
      JOIN clientes c ON m.id_cliente = c.id
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (clientId) {
      whereClauses.push('m.id_cliente = ?');
      params.push(parseInt(clientId));
    }
    if (startDate) {
      whereClauses.push('m.fecha >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('m.fecha <= ?');
      params.push(endDate);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY m.fecha DESC, m.id DESC';

    const stmt = db.prepare(query);
    const movements = stmt.all(...params);

    return NextResponse.json(movements);
  } catch (error: any) {
    console.error('Error fetching movements:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_cliente, fecha, detalle, banco, boleta, credito, abono } = body;

    if (!id_cliente || !fecha || !detalle) {
      return NextResponse.json(
        { error: 'Cliente, fecha y detalle son requeridos.' },
        { status: 400 }
      );
    }

    // Verify client exists
    const clientExists = db.prepare('SELECT 1 FROM clientes WHERE id = ?').get(id_cliente);
    if (!clientExists) {
      return NextResponse.json({ error: 'El cliente especificado no existe.' }, { status: 404 });
    }

    const stmt = db.prepare(`
      INSERT INTO movimientos (id_cliente, fecha, detalle, banco, boleta, credito, abono)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      id_cliente,
      fecha, // Must be YYYY-MM-DD
      detalle,
      banco || null,
      boleta || null,
      Number(credito || 0),
      Number(abono || 0)
    );

    const newMovement = db.prepare(`
      SELECT m.*, c.nombre AS cliente_nombre
      FROM movimientos m
      JOIN clientes c ON m.id_cliente = c.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json(newMovement, { status: 201 });
  } catch (error: any) {
    console.error('Error creating movement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
