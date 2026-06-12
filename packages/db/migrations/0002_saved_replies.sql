CREATE TABLE IF NOT EXISTS saved_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  mailbox_id UUID REFERENCES mailboxes(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_replies_mailbox_idx ON saved_replies(mailbox_id);
