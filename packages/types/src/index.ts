// Shared domain types — consumed by web, api, and workers.

// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'agent';
export type UserStatus = 'active' | 'disabled' | 'deleted';
export type UserInviteState = 'activated' | 'sent' | 'not_invited';

export type ConversationType = 'email' | 'phone' | 'chat' | 'custom';
export type ConversationStatus = 'active' | 'pending' | 'closed' | 'spam';
export type ConversationState = 'draft' | 'published' | 'deleted';

export type MessageType = 'customer' | 'agent' | 'note' | 'lineitem' | 'chat';
export type MessageState = 'draft' | 'published' | 'hidden' | 'review';
export type MessageActionType =
  | 'status_changed'
  | 'assignee_changed'
  | 'moved_from_mailbox'
  | 'merged'
  | 'imported'
  | 'customer_changed'
  | 'deleted'
  | 'restored';

export type SourceVia = 'customer' | 'user';
export type SourceType = 'email' | 'web' | 'api';

export type FolderType =
  | 'unassigned'
  | 'mine'
  | 'starred'
  | 'drafts'
  | 'assigned'
  | 'closed'
  | 'deleted'
  | 'spam';

export type SendLogStatus =
  | 'accepted'
  | 'send_error'
  | 'delivery_success'
  | 'delivery_error'
  | 'opened'
  | 'clicked'
  | 'unsubscribed'
  | 'complained';

export type AfterSend = 'stay' | 'next' | 'folder';

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  jobTitle: string | null;
  phone: string | null;
  timezone: string;
  createdAt: string;
}

export interface Mailbox {
  id: string;
  name: string;
  email: string;
  aliases: string | null;
  fromName: 'mailbox' | 'user' | 'custom';
  fromNameCustom: string | null;
  ticketStatus: 'keep' | 'active' | 'pending' | 'closed';
  ticketAssignee: 'keep' | 'anyone' | 'replying_unassigned' | 'replying';
  signature: string | null;
  autoReplyEnabled: boolean;
  autoReplySubject: string | null;
  autoReplyMessage: string | null;
  createdAt: string;
}

export interface MailboxUser {
  mailboxId: string;
  userId: string;
  afterSend: AfterSend;
  hide: boolean;
  mute: boolean;
}

export interface Folder {
  id: string;
  mailboxId: string;
  userId: string | null;
  type: FolderType;
  activeCount: number;
  totalCount: number;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  phones: string[] | null;
  websites: string[] | null;
  notes: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  subject: string;
  type: ConversationType;
  status: ConversationStatus;
  state: ConversationState;
  mailbox: Pick<Mailbox, 'id' | 'name' | 'email'>;
  customer: Pick<Customer, 'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'>;
  assignee: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'> | null;
  cc: string[] | null;
  bcc: string[] | null;
  preview: string | null;
  threadsCount: number;
  hasAttachments: boolean;
  lastReplyAt: string | null;
  lastReplyFrom: SourceVia | null;
  readByUser: boolean;
  sourceType: SourceType;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  type: MessageType;
  state: MessageState;
  // Only set for lineitems
  actionType: MessageActionType | null;
  actionData: string | null;
  // Only set for non-lineitems
  body: string | null;
  from: string | null;
  to: string[] | null;
  cc: string[] | null;
  bcc: string[] | null;
  author: MessageAuthor;
  attachments: Attachment[];
  first: boolean;
  hasAttachments: boolean;
  openedAt: string | null;
  editedAt: string | null;
  createdAt: string;
}

export type MessageAuthor =
  | { kind: 'customer'; id: string; email: string; firstName: string | null; lastName: string | null }
  | { kind: 'agent'; id: string; firstName: string; lastName: string }
  | { kind: 'system' };

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;   // presigned download URL
  embedded: boolean;
}

// ─── API Response Envelopes ───────────────────────────────────────────────────

export interface ApiList<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

// ─── Queue Job Payloads ───────────────────────────────────────────────────────

export interface OutboundEmailJob {
  messageId: string;
  conversationId: string;
  mailboxId: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
  attachmentKeys?: string[];
}

export interface InboundEmailJob {
  mailboxId: string;
  rawMessagePath: string;  // S3 key for raw .eml stored by IMAP worker
  uid: number;
}
