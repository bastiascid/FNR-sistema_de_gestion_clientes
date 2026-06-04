import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabase = await getSupabaseServer();
    let query = supabase.from('movimientos').select('*, clientes (nombre)');

    if (clientId) {
      query = query.eq('id_cliente', parseInt(clientId));
    }
    if (startDate) {
      query = query.gte('fecha', startDate);
    }
    if (endDate) {
      query = query.lte('fecha', endDate);
    }

    const { data: movements, error } = await query
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      throw error;
    }

    const formattedMovements = (movements || []).map((m: any) => ({
      ...m,
      cliente_nombre: m.clientes ? m.clientes.nombre : null,
      clientes: undefined
    }));

    return NextResponse.json(formattedMovements);
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

    const supabase = await getSupabaseServer();
    
    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', id_cliente)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'El cliente especificado no existe.' }, { status: 404 });
    }

    const { data: newMovement, error: insertError } = await supabase
      .from('movimientos')
      .insert({
        id_cliente,
        fecha,
        detalle,
        banco: banco || null,
        boleta: boleta || null,
        credito: Number(credito || 0),
        abono: Number(abono || 0)
      })
      .select('*, clientes (nombre)')
      .single();

    if (insertError) {
      throw insertError;
    }

    const formattedMovement = {
      ...newMovement,
      cliente_nombre: newMovement.clientes ? newMovement.clientes.nombre : null,
      clientes: undefined
    };

    return NextResponse.json(formattedMovement, { status: 201 });
  } catch (error: any) {
    console.error('Error creating movement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
