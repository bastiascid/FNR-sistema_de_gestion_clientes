import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to clean and format RUT
function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

// Helper to format RUT nicely for saving (e.g. 12345678-K to 12.345.678-K)
function formatRut(rut: string): string {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return cleaned;
  
  const dv = cleaned.slice(-1);
  const num = cleaned.slice(0, -1);
  
  // Add thousands separators
  let formattedNum = '';
  for (let i = num.length - 1, j = 0; i >= 0; i--, j++) {
    if (j > 0 && j % 3 === 0) {
      formattedNum = '.' + formattedNum;
    }
    formattedNum = num[i] + formattedNum;
  }
  
  return `${formattedNum}-${dv}`;
}

// Helper to normalize names for search
function cleanName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, '') // remove special characters
    .replace(/\s+/g, ' ') // normalize spaces
    .trim();
}

// Check if names match
function matchName(dbName: string, queryName: string): boolean {
  const dbClean = cleanName(dbName);
  const qClean = cleanName(queryName);

  if (dbClean === qClean) return true;

  const dbWords = dbClean.split(' ').filter(w => w.length > 2); // Ignore short words/connectors
  const qWords = qClean.split(' ').filter(w => w.length > 2);

  if (dbWords.length === 0 || qWords.length === 0) return false;

  const matches = qWords.filter(word => dbWords.includes(word));
  const matchRatio = matches.length / Math.min(dbWords.length, qWords.length);

  const containsFull = dbClean.includes(qClean) || qClean.includes(dbClean);

  return matchRatio >= 0.66 || containsFull;
}

export async function POST(request: Request) {
  try {
    // 1. Verify API Key Auth
    const apiKeyHeader = request.headers.get('x-sii-extension-key');
    const authHeader = request.headers.get('Authorization');
    
    const serverApiKey = process.env.SII_EXTENSION_KEY || 'fnr-secret-default-key-2026';
    
    let providedKey = apiKeyHeader;
    if (!providedKey && authHeader && authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7);
    }
    
    if (!providedKey || providedKey !== serverApiKey) {
      return NextResponse.json({ error: 'No autorizado. API Key inválida.' }, { status: 401 });
    }

    // 2. Parse payload
    const body = await request.json();
    const { 
      boleta,          // Boleta number (string/number)
      rut_emisor,      // RUT of the professional (string)
      nombre_emisor,   // Name of the professional (string)
      fecha,           // Date (YYYY-MM-DD)
      monto,           // Gross amount (number)
      detalle          // Optional description (string)
    } = body;

    if (!boleta || !rut_emisor || !nombre_emisor || !fecha || !monto) {
      return NextResponse.json({ 
        error: 'Campos requeridos faltantes: boleta, rut_emisor, nombre_emisor, fecha, monto' 
      }, { status: 400 });
    }

    // Create admin Supabase client to bypass RLS policies for webhooks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Configuración del servidor de base de datos incompleta.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const parsedBoleta = String(boleta).trim();
    const cleanedRut = cleanRut(rut_emisor);
    const prettyRut = formatRut(rut_emisor);
    const cleanedMonto = Number(monto);

    // 3. Match Client
    let clientMatch: any = null;

    // Search by RUT first
    // Check with clean RUT and also formatted RUT variations
    const { data: clientsByRut, error: rutError } = await supabase
      .from('clientes')
      .select('*')
      .or(`rut.eq.${prettyRut},rut.eq.${cleanedRut}`);

    if (rutError) {
      throw rutError;
    }

    if (clientsByRut && clientsByRut.length > 0) {
      clientMatch = clientsByRut[0];
      console.log(`Matched client by RUT: ${clientMatch.nombre} (ID: ${clientMatch.id})`);
    } else {
      // Search by Name since RUT was not matched or is null
      console.log(`RUT match failed for RUT ${prettyRut}. Attempting smart name match for "${nombre_emisor}"...`);
      
      const { data: allClients, error: nameError } = await supabase
        .from('clientes')
        .select('*');

      if (nameError) {
        throw nameError;
      }

      if (allClients) {
        // Find best match in database
        clientMatch = allClients.find(c => matchName(c.nombre, nombre_emisor));
      }

      if (clientMatch) {
        console.log(`Matched client by name: ${clientMatch.nombre} (ID: ${clientMatch.id})`);
        
        // Auto-update RUT if empty or different (learning RUT)
        if (!clientMatch.rut || cleanRut(clientMatch.rut) !== cleanedRut) {
          console.log(`Updating client ID ${clientMatch.id} with RUT ${prettyRut}...`);
          const { error: updateError } = await supabase
            .from('clientes')
            .update({ rut: prettyRut })
            .eq('id', clientMatch.id);
            
          if (updateError) {
            console.error('Failed to update client RUT:', updateError);
          } else {
            clientMatch.rut = prettyRut;
          }
        }
      }
    }

    // 4. Create new client if not matched
    if (!clientMatch) {
      console.log(`No match found. Creating new client: "${nombre_emisor.toUpperCase()}" with RUT ${prettyRut}...`);
      const { data: newClient, error: createError } = await supabase
        .from('clientes')
        .insert({
          nombre: nombre_emisor.toUpperCase().trim(),
          rut: prettyRut
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      clientMatch = newClient;
      console.log(`Created new client with ID ${clientMatch.id}`);
    }

    // 5. Check if this specific boleta was already registered for this client
    // to prevent duplicate ingestion if the extension runs multiple times on the same page
    const { data: existingMovement, error: existError } = await supabase
      .from('movimientos')
      .select('id')
      .eq('id_cliente', clientMatch.id)
      .eq('boleta', parsedBoleta)
      .limit(1);

    if (existError) {
      throw existError;
    }

    if (existingMovement && existingMovement.length > 0) {
      return NextResponse.json({ 
        message: 'Boleta ya registrada previamente.', 
        movement_id: existingMovement[0].id,
        client: clientMatch
      }, { status: 200 });
    }

    // 6. Register movement
    const finalDetalle = detalle || `Boleta de Honorarios N° ${parsedBoleta}`;
    
    console.log(`Registering movement for client ${clientMatch.nombre}: ${finalDetalle} - amount ${cleanedMonto}`);
    const { data: newMovement, error: insertError } = await supabase
      .from('movimientos')
      .insert({
        id_cliente: clientMatch.id,
        fecha: fecha,
        detalle: finalDetalle,
        boleta: parsedBoleta,
        credito: cleanedMonto,
        abono: 0
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Boleta registrada exitosamente.',
      client: {
        id: clientMatch.id,
        nombre: clientMatch.nombre,
        rut: clientMatch.rut
      },
      movement: newMovement
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in sii/boleta endpoint:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
