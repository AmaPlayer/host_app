-- Event Participation Schema

CREATE TABLE IF NOT EXISTS public.event_participations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('going', 'interested', 'maybe')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_event_participations_event ON public.event_participations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participations_user ON public.event_participations(user_id);
