-- Ensure RLS is not blocking reads on houses
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'houses' AND schemaname = 'public') THEN
        ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Anyone can read houses" ON houses;
        CREATE POLICY "Anyone can read houses" ON houses FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Admins can manage houses" ON houses;
        CREATE POLICY "Admins can manage houses" ON houses FOR ALL TO authenticated 
        USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
        WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));
    END IF;
END $$;
