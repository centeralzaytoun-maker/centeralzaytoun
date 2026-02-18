CREATE TABLE IF NOT EXISTS public.parent_device_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  student_id uuid NULL,
  token text NOT NULL,
  device_type text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT parent_device_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT parent_device_tokens_token_key UNIQUE (token),
  CONSTRAINT parent_device_tokens_student_id_fkey FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
) TABLESPACE pg_default;
