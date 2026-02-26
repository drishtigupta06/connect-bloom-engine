
-- Add branding columns to institutions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#6366f1';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#8b5cf6';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#f59e0b';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS white_label_enabled boolean DEFAULT false;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS custom_domain text;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS tagline text;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS favicon_url text;

-- Allow institution admins to manage their institution
CREATE POLICY "Institution admins can update their institution"
ON public.institutions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.institution_id = institutions.id
  ) AND public.has_role(auth.uid(), 'institution_admin')
);

-- Storage bucket for institution logos
INSERT INTO storage.buckets (id, name, public) VALUES ('institution-assets', 'institution-assets', true);

CREATE POLICY "Anyone can view institution assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'institution-assets');

CREATE POLICY "Institution admins can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'institution-assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Institution admins can update assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'institution-assets'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Institution admins can delete assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'institution-assets'
  AND auth.role() = 'authenticated'
);
