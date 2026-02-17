-- Supabase Storage Policies for SoussMassa-RH
-- Policies for CV storage bucket

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public can read CVs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload CVs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own CVs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own CVs" ON storage.objects;

-- Storage Policies for CVs bucket
-- Public can read CVs (for download)
CREATE POLICY "Public can read CVs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'cvs'
);

-- Users can upload their CVs (filename format: user_id/filename)
CREATE POLICY "Users can upload CVs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'cvs' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own CVs
CREATE POLICY "Users can update own CVs" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'cvs'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own CVs
CREATE POLICY "Users can delete own CVs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'cvs'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: The bucket 'cvs' needs to be created manually in the Supabase dashboard
-- or via the Storage API before these policies take effect