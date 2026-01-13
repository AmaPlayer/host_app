-- =====================================================
-- NOTIFICATIONS TABLE FOR REPOST FEATURE
-- Pure Supabase implementation (no Firebase)
-- =====================================================

-- Drop existing table and recreate with correct schema
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Create notifications table with Firebase UIDs (TEXT) for user identification
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Recipient information (using Firebase UID for compatibility)
  recipient_id TEXT NOT NULL,

  -- Sender information (using Firebase UID for compatibility)
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_photo_url TEXT,

  -- Notification details
  type TEXT NOT NULL, -- 'post_shared', 'like', 'comment', etc.
  message TEXT NOT NULL,

  -- Related content
  post_id TEXT, -- Can be UUID or Firebase post ID
  repost_id UUID REFERENCES public.repost(id) ON DELETE CASCADE,

  -- Status
  is_read BOOLEAN DEFAULT FALSE NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for fetching user's notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id
  ON public.notifications(recipient_id, created_at DESC)
  WHERE is_read = FALSE;

-- Index for marking notifications as read
CREATE INDEX IF NOT EXISTS idx_notifications_is_read
  ON public.notifications(recipient_id, is_read);

-- Index for notification type filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON public.notifications(type, created_at DESC);

-- Index for post-related notifications
CREATE INDEX IF NOT EXISTS idx_notifications_post_id
  ON public.notifications(post_id)
  WHERE post_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (recipient_id = auth.uid()::text);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (recipient_id = auth.uid()::text)
  WITH CHECK (recipient_id = auth.uid()::text);

-- Policy: Authenticated users can create notifications (system use)
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (recipient_id = auth.uid()::text);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id_param TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE recipient_id = user_id_param
      AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = notification_id_param
    AND recipient_id = auth.uid()::text;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE recipient_id = user_id_param
    AND is_read = FALSE
    AND recipient_id = auth.uid()::text;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Delete old read notifications (cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE is_read = TRUE
    AND read_at < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.notifications IS 'Stores all user notifications for reposts, likes, comments, etc.';
COMMENT ON COLUMN public.notifications.recipient_id IS 'User who receives the notification';
COMMENT ON COLUMN public.notifications.sender_id IS 'User who triggered the notification';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: post_shared, like, comment, follow, etc.';
COMMENT ON COLUMN public.notifications.post_id IS 'Related post ID (can be Supabase UUID or Firebase ID)';
COMMENT ON COLUMN public.notifications.repost_id IS 'Related repost ID if notification is about a repost';

-- =====================================================
-- SAMPLE QUERIES
-- =====================================================

-- Get user's unread notifications
-- SELECT * FROM notifications WHERE recipient_id = 'user-uuid' AND is_read = FALSE ORDER BY created_at DESC;

-- Get unread count
-- SELECT get_unread_notification_count('user-uuid');

-- Mark as read
-- SELECT mark_notification_read('notification-uuid');

-- Mark all as read
-- SELECT mark_all_notifications_read('user-uuid');

-- Cleanup old notifications (run periodically)
-- SELECT cleanup_old_notifications(30);
