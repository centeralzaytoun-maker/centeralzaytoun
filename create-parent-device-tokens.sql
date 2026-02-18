-- 🗃️ Create parent_device_tokens table with correct structure
-- Run this in Supabase SQL Editor

-- Drop table if exists (for clean recreation)
DROP TABLE IF EXISTS public.parent_device_tokens CASCADE;

-- Create table with correct structure
CREATE TABLE public.parent_device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  device_type TEXT DEFAULT 'web',
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_parent_device_tokens_student_id ON public.parent_device_tokens(student_id);
CREATE INDEX idx_parent_device_tokens_device_token ON public.parent_device_tokens(device_token);
CREATE INDEX idx_parent_device_tokens_center_id ON public.parent_device_tokens(center_id);

-- Enable Row Level Security
ALTER TABLE public.parent_device_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Parents can view their own device tokens" ON public.parent_device_tokens
  FOR SELECT USING (
    auth.uid()::text = student_id::text
  );

CREATE POLICY "Parents can insert their own device tokens" ON public.parent_device_tokens
  FOR INSERT WITH CHECK (
    auth.uid()::text = student_id::text
  );

CREATE POLICY "Parents can update their own device tokens" ON public.parent_device_tokens
  FOR UPDATE USING (
    auth.uid()::text = student_id::text
  );

CREATE POLICY "Parents can delete their own device tokens" ON public.parent_device_tokens
  FOR DELETE USING (
    auth.uid()::text = student_id::text
  );

-- Create unique constraint on device_token per student
ALTER TABLE public.parent_device_tokens 
ADD CONSTRAINT unique_device_token_per_student 
UNIQUE (device_token, student_id);

-- Grant permissions
GRANT ALL ON public.parent_device_tokens TO authenticated;
GRANT SELECT ON public.parent_device_tokens TO anon;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_parent_device_tokens_updated_at
  BEFORE UPDATE ON public.parent_device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Test the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'parent_device_tokens' 
AND table_schema = 'public'
ORDER BY ordinal_position;
