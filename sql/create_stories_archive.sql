-- Create the stories_archive table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.stories_archive (
    id TEXT PRIMARY KEY, -- Use TEXT to support both UUIDs and potentially Firestore IDs
    user_id UUID REFERENCES public.users(id),
    media_url TEXT,
    media_type TEXT,
    caption TEXT,
    view_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add index on user_id for faster lookups of history
CREATE INDEX IF NOT EXISTS idx_stories_archive_user_id ON public.stories_archive(user_id);

-- Enable RLS (Optional, depending on if you want users to see their own archive)
ALTER TABLE public.stories_archive ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own archived stories
CREATE POLICY "Users can view their own archived stories" 
ON public.stories_archive FOR SELECT 
USING (auth.uid() = (SELECT uid FROM public.users WHERE id = stories_archive.user_id));

-- Policy: Service role (Admin) can insert/delete
-- (Implicitly allowed for service role, but explicit for authenticated users if needed)
