-- Enhance Talent Videos and Event Submissions

-- 1. Enhance talent_videos table
ALTER TABLE public.talent_videos
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending', -- pending, verified, rejected
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS approval_reason TEXT,
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flag_reason TEXT,
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verifications JSONB DEFAULT '[]'::JSONB, -- For detailed verification history
ADD COLUMN IF NOT EXISTS skills TEXT[], -- Array of skills
ADD COLUMN IF NOT EXISTS verification_deadline TIMESTAMPTZ;

-- 2. Enhance event_submissions table
ALTER TABLE public.event_submissions
ADD COLUMN IF NOT EXISTS rank INTEGER, -- 1, 2, 3
ADD COLUMN IF NOT EXISTS prize TEXT,
ADD COLUMN IF NOT EXISTS scores JSONB DEFAULT '{}'::JSONB; -- { quality, time, difficulty }

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_talent_videos_status ON public.talent_videos(verification_status);
CREATE INDEX IF NOT EXISTS idx_talent_videos_user ON public.talent_videos(user_id);
