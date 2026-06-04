import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { headers } = request;
    const host = headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const serverUrl = `${protocol}://${host}`;

    const extensionKey = process.env.SII_EXTENSION_KEY || 'fnr-secret-default-key-2026';

    return NextResponse.json({
      url: serverUrl,
      apiKey: extensionKey,
      isCustom: !!process.env.SII_EXTENSION_KEY
    });
  } catch (error: any) {
    console.error('Error fetching SII config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
