import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with the service role key for admin privileges
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
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
    const payload = req.body;
    console.log('Received payload:', payload);

    // Validate required fields
    const { barcode_no, material_name, status, scanned_at } = payload;
    
    if (!barcode_no || !material_name || !status || !scanned_at) {
      return res.status(400).json({ 
        error: 'Missing required fields: barcode_no, material_name, status, scanned_at' 
      });
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('scan_logs')
      .insert([
        {
          barcode_no: payload.barcode_no,
          material_name: payload.material_name,
          batch_no: payload.batch_no || null,
          vendor_name: payload.vendor_name || null,
          quantity_kg: payload.quantity_kg || null,
          status: payload.status,
          payload: payload, // storing the full raw payload
          scanned_at: payload.scanned_at,
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to insert data into database.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
