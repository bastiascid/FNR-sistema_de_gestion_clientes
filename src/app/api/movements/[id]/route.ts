import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

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

    const supabase = await getSupabaseServer();
    const { data: updatedMovement, error } = await supabase
      .from('movimientos')
      .update({
        fecha,
        detalle,
        banco: banco || null,
        boleta: boleta || null,
        credito: Number(credito || 0),
        abono: Number(abono || 0)
      })
      .eq('id', id)
      .select('*, clientes (nombre)')
      .single();

    if (error || !updatedMovement) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }

    const formattedMovement = {
      ...updatedMovement,
      cliente_nombre: updatedMovement.clientes ? updatedMovement.clientes.nombre : null,
      clientes: undefined
    };

    return NextResponse.json(formattedMovement);
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
    const supabase = await getSupabaseServer();
    const { error } = await supabase
      .from('movimientos')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Movimiento eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting movement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
