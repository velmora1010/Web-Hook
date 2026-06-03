import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with the service role key for admin privileges
declare const process: {
  env: Record<string, string | undefined>;
};

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Please use POST.' });
  }

  try {
    const body = req.body;
    console.log('Received payload:', body);

    const insertPayload = {
      barcode_no: body.barcode_no ?? null,
      material_name: body.material_name ?? null,
      batch_no: body.batch_no ? Number(body.batch_no) : null,
      vendor_name: body.vendor_name ?? null,
      quantity_kg: body.quantity_kg ? Number(body.quantity_kg) : null,
      status: body.status ?? "Stock In",
      scanned_at: body.scanned_at ?? new Date().toISOString(),
      payload: body.payload ?? body
    };

    const { data, error } = await supabase
      .from("scan_logs")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ success: false, error });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
