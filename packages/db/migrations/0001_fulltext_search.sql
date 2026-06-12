-- Add tsvector columns for full-text search
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(customer_email, ''))
  ) STORED;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(body, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS conversations_search_idx ON conversations USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS messages_search_idx ON messages USING GIN (search_vector);
