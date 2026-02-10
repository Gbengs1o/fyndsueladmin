-- Run this in your Supabase SQL Editor

-- 1. Add price columns to stations table
ALTER TABLE stations ADD COLUMN IF NOT EXISTS price_pms DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS price_ago DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS price_dpk DECIMAL(10, 2) DEFAULT 0;

-- 2. Create price_logs table for history
CREATE TABLE IF NOT EXISTS price_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id BIGINT REFERENCES stations(id) ON DELETE CASCADE,
  fuel_type TEXT NOT NULL, -- 'pms', 'ago', 'dpk'
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 3. Enable RLS
ALTER TABLE price_logs ENABLE ROW LEVEL SECURITY;

-- 4. Add Policies (using DO block to avoid errors if they exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'price_logs' AND policyname = 'Managers can view own logs'
    ) THEN
        CREATE POLICY "Managers can view own logs" ON price_logs FOR SELECT USING (auth.uid() IN (SELECT id FROM manager_profiles WHERE station_id = price_logs.station_id));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'price_logs' AND policyname = 'Managers can insert own logs'
    ) THEN
        CREATE POLICY "Managers can insert own logs" ON price_logs FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM manager_profiles WHERE station_id = price_logs.station_id));
    END IF;
END
$$;
