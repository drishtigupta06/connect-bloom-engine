
-- Success Stories
CREATE TABLE public.success_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stories viewable by all authenticated" ON public.success_stories FOR SELECT USING (true);
CREATE POLICY "Users create own stories" ON public.success_stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own stories" ON public.success_stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage stories" ON public.success_stories FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'institution_admin'::app_role));
CREATE TRIGGER update_success_stories_updated_at BEFORE UPDATE ON public.success_stories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fundraising Campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID REFERENCES public.institutions(id),
  title TEXT NOT NULL,
  description TEXT,
  goal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  raised_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campaigns viewable by all authenticated" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Admins manage campaigns" ON public.campaigns FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'institution_admin'::app_role));
CREATE POLICY "Users create campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Donations
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own donations" ON public.donations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all donations" ON public.donations FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'institution_admin'::app_role));
CREATE POLICY "Users create donations" ON public.donations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update campaign raised_amount on donation
CREATE OR REPLACE FUNCTION public.update_campaign_raised()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.campaigns
  SET raised_amount = raised_amount + NEW.amount
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_donation_insert
AFTER INSERT ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.update_campaign_raised();

-- Forum Posts
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}'::text[],
  category TEXT NOT NULL DEFAULT 'general',
  is_pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Forum posts viewable by authenticated" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "Users create forum posts" ON public.forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own forum posts" ON public.forum_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own forum posts" ON public.forum_posts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON public.forum_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Forum Replies
CREATE TABLE public.forum_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Forum replies viewable by authenticated" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "Users create forum replies" ON public.forum_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own forum replies" ON public.forum_replies FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update replies_count
CREATE OR REPLACE FUNCTION public.update_forum_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET replies_count = replies_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_posts SET replies_count = replies_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_forum_reply_change
AFTER INSERT OR DELETE ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.update_forum_replies_count();
