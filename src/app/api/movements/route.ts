import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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

    const db = await getDb();
    const movements = await db.all(query, ...params);

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

    const db = await getDb();
    
    // Verify client exists
    const clientExists = await db.get('SELECT 1 FROM clientes WHERE id = ?', id_cliente);
    if (!clientExists) {
      return NextResponse.json({ error: 'El cliente especificado no existe.' }, { status: 404 });
    }

    const result = await db.run(
      `INSERT INTO movimientos (id_cliente, fecha, detalle, banco, boleta, credito, abono)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id_cliente,
      fecha,
      detalle,
      banco || null,
      boleta || null,
      Number(credito || 0),
      Number(abono || 0)
    );

    const newMovement = await db.get(`
      SELECT m.*, c.nombre AS cliente_nombre
      FROM movimientos m
      JOIN clientes c ON m.id_cliente = c.id
      WHERE m.id = ?
    `, result.lastID);

    return NextResponse.json(newMovement, { status: 201 });
  } catch (error: any) {
    console.error('Error creating movement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
