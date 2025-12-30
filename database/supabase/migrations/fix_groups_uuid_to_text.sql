-- Corrected Migration
-- Changing columns to TEXT to support Firebase UIDs

-- 1. Groups Table (Column is 'creator_id', not 'created_by')
ALTER TABLE groups ALTER COLUMN creator_id TYPE text;

-- 2. Group Members Table
ALTER TABLE group_members ALTER COLUMN user_id TYPE text;
