import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error: any) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, rut, telefono, correo, direccion, observaciones } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const stmt = db.prepare(`
      UPDATE clientes
      SET nombre = ?, rut = ?, telefono = ?, correo = ?, direccion = ?, observaciones = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      nombre,
      rut || null,
      telefono || null,
      correo || null,
      direccion || null,
      observaciones || null,
      id
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const updatedClient = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = db.prepare('DELETE FROM clientes WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Cliente eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
