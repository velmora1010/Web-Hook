-- Create the scan_logs table
CREATE TABLE IF NOT EXISTS public.scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode_no TEXT NOT NULL,
    material_name TEXT NOT NULL,
    batch_no INTEGER,
    vendor_name TEXT,
    quantity_kg NUMERIC,
    status TEXT,
    payload JSONB,
    scanned_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Turn on Realtime for the scan_logs table
-- First, ensure the realtime publication exists
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

-- Then add the scan_logs table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_logs;

-- Set up Row Level Security (RLS)
-- Enable RLS on the table
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (since this is a public dashboard)
-- NOTE: In a production app you might want to restrict this
CREATE POLICY "Allow public read access"
ON public.scan_logs
FOR SELECT
USING (true);

-- Note: We do NOT allow public inserts from the frontend.
-- Inserts will be handled securely by the Vercel Serverless Function 
-- using the SERVICE_ROLE_KEY.
