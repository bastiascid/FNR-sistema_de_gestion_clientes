import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'ID de cliente es requerido.' }, { status: 400 });
    }

    const supabase = await getSupabaseServer();

    // 1. Fetch client info
    const { data: client, error: clientError } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // 2. Fetch all movements chronologically
    const { data: movements, error: movementsError } = await supabase
      .from('movimientos')
      .select('*')
      .eq('id_cliente', clientId)
      .order('fecha', { ascending: true })
      .order('id', { ascending: true });

    if (movementsError) {
      throw movementsError;
    }

    // 3. Compute running balance (saldo acumulado) step-by-step
    let runningBalance = 0;
    let totalDebe = 0;
    let totalHaber = 0;

    const movementsWithBalance = (movements || []).map(m => {
      totalDebe += m.credito;
      totalHaber += m.abono;
      runningBalance = runningBalance + m.credito - m.abono;
      
      return {
        ...m,
        saldoAcumulado: runningBalance
      };
    });

    return NextResponse.json({
      client,
      movements: movementsWithBalance,
      summary: {
        totalDebe,
        totalHaber,
        finalSaldo: runningBalance
      }
    });
  } catch (error: any) {
    console.error('Error generating account statement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
