import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseServer();
    const { data: client, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !client) {
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

    const supabase = await getSupabaseServer();
    const { data: updatedClient, error } = await supabase
      .from('clientes')
      .update({
        nombre,
        rut: rut || null,
        telefono: telefono || null,
        correo: correo || null,
        direccion: direccion || null,
        observaciones: observaciones || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedClient) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

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
    const supabase = await getSupabaseServer();
    const { error, count } = await supabase
      .from('clientes')
      .delete({ count: 'planned' })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Cliente eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
