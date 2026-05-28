import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'ID de cliente es requerido.' }, { status: 400 });
    }

    // 1. Fetch client info
    const client = db.prepare('SELECT * FROM clientes WHERE id = ?').get(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // 2. Fetch all movements chronologically (ordered by date ascending, then ID ascending)
    const movements = db.prepare(`
      SELECT * FROM movimientos
      WHERE id_cliente = ?
      ORDER BY fecha ASC, id ASC
    `).all(clientId) as any[];

    // 3. Compute running balance (saldo acumulado) step-by-step
    let runningBalance = 0;
    let totalDebe = 0;
    let totalHaber = 0;

    const movementsWithBalance = movements.map(m => {
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
