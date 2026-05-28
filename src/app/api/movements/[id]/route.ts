import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fecha, detalle, banco, boleta, credito, abono } = body;

    if (!fecha || !detalle) {
      return NextResponse.json(
        { error: 'Fecha y detalle son obligatorios.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.run(
      `UPDATE movimientos
       SET fecha = ?, detalle = ?, banco = ?, boleta = ?, credito = ?, abono = ?
       WHERE id = ?`,
      fecha,
      detalle,
      banco || null,
      boleta || null,
      Number(credito || 0),
      Number(abono || 0),
      id
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }

    const updatedMovement = await db.get(`
      SELECT m.*, c.nombre AS cliente_nombre
      FROM movimientos m
      JOIN clientes c ON m.id_cliente = c.id
      WHERE m.id = ?
    `, id);

    return NextResponse.json(updatedMovement);
  } catch (error: any) {
    console.error('Error updating movement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const result = await db.run('DELETE FROM movimientos WHERE id = ?', id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Movimiento eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting movement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
