import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const supabase = await getSupabaseServer();
    let query = supabase.from('clientes_resumen').select('*');

    if (search) {
      query = query.or(`nombre.ilike.%${search}%,rut.ilike.%${search}%`);
    }

    const { data: clients, error } = await query.order('nombre', { ascending: true });

    if (error) {
      throw error;
    }

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

    const supabase = await getSupabaseServer();
    const { data: newClient, error } = await supabase
      .from('clientes')
      .insert({
        nombre,
        rut: rut || null,
        telefono: telefono || null,
        correo: correo || null,
        direccion: direccion || null,
        observaciones: observaciones || null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
