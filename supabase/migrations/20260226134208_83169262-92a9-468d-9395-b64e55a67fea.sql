
-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Users can upload their own resumes
CREATE POLICY "Users upload own resumes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own resumes
CREATE POLICY "Users view own resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own resumes
CREATE POLICY "Users delete own resumes"
ON storage.objects FOR DELETE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role can read all resumes (for edge function)
CREATE POLICY "Service can read resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes');
