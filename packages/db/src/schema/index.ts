import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['admin', 'agent']);
export const userStatusEnum = pgEnum('user_status', ['active', 'disabled', 'deleted']);
export const userInviteStateEnum = pgEnum('user_invite_state', ['activated', 'sent', 'not_invited']);

export const conversationTypeEnum = pgEnum('conversation_type', ['email', 'phone', 'chat', 'custom']);
export const conversationStatusEnum = pgEnum('conversation_status', ['active', 'pending', 'closed', 'spam']);
export const conversationStateEnum = pgEnum('conversation_state', ['draft', 'published', 'deleted']);
export const sourceTypeEnum = pgEnum('source_type', ['email', 'web', 'api']);
export const sourceViaEnum = pgEnum('source_via', ['customer', 'user']);

export const messageTypeEnum = pgEnum('message_type', ['customer', 'agent', 'note', 'lineitem', 'chat']);
export const messageStateEnum = pgEnum('message_state', ['draft', 'published', 'hidden', 'review']);

// action_type for lineitem messages
export const messageActionTypeEnum = pgEnum('message_action_type', [
  'status_changed',       // 1
  'assignee_changed',     // 2
  'moved_from_mailbox',   // 3
  'merged',               // 4
  'imported',             // 5
  'customer_changed',     // 9
  'deleted',              // 10
  'restored',             // 11
]);

export const folderTypeEnum = pgEnum('folder_type', [
  'unassigned',   // 1  – shared: all open unassigned
  'mine',         // 20 – personal: assigned to me
  'starred',      // 25 – personal: starred by me
  'drafts',       // 30 – shared
  'assigned',     // 40 – shared: all assigned
  'closed',       // 60 – shared
  'deleted',      // 70 – shared
  'spam',         // 80 – shared
]);

export const mailboxFromNameEnum = pgEnum('mailbox_from_name', ['mailbox', 'user', 'custom']);
export const mailboxTicketStatusEnum = pgEnum('mailbox_ticket_status', ['keep', 'active', 'pending', 'closed']);
export const mailboxTicketAssigneeEnum = pgEnum('mailbox_ticket_assignee', [
  'keep', 'anyone', 'replying_unassigned', 'replying',
]);
export const mailboxOutMethodEnum = pgEnum('mailbox_out_method', ['php_mail', 'sendmail', 'smtp']);
export const mailboxOutEncryptionEnum = pgEnum('mailbox_out_encryption', ['none', 'ssl', 'tls']);
export const mailboxInProtocolEnum = pgEnum('mailbox_in_protocol', ['imap', 'pop3']);
export const mailboxInEncryptionEnum = pgEnum('mailbox_in_encryption', ['none', 'ssl', 'tls', 'starttls']);

export const sendLogMailTypeEnum = pgEnum('send_log_mail_type', [
  'email_to_customer', 'user_notification', 'auto_reply',
  'invite', 'password_changed', 'test', 'alert',
]);
export const sendLogStatusEnum = pgEnum('send_log_status', [
  'accepted', 'send_error', 'delivery_success', 'delivery_error',
  'opened', 'clicked', 'unsubscribed', 'complained',
]);

export const afterSendEnum = pgEnum('after_send', ['stay', 'next', 'folder']);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('agent'),
  status: userStatusEnum('status').notNull().default('active'),
  inviteState: userInviteStateEnum('invite_state').notNull().default('not_invited'),
  inviteHash: text('invite_hash'),
  avatarUrl: text('avatar_url'),
  jobTitle: text('job_title'),
  phone: text('phone'),
  timezone: text('timezone').notNull().default('UTC'),
  locale: text('locale'),
  permissions: jsonb('permissions').$type<Record<string, boolean>>(),
  locked: boolean('locked').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('users_status_idx').on(t.status),
]);

// ─── Mailboxes ────────────────────────────────────────────────────────────────

export const mailboxes = pgTable('mailboxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  aliases: text('aliases'),              // comma-separated
  aliasesReply: boolean('aliases_reply').notNull().default(false),

  // Outgoing display
  fromName: mailboxFromNameEnum('from_name').notNull().default('mailbox'),
  fromNameCustom: text('from_name_custom'),

  // Reply behavior defaults
  ticketStatus: mailboxTicketStatusEnum('ticket_status').notNull().default('pending'),
  ticketAssignee: mailboxTicketAssigneeEnum('ticket_assignee').notNull().default('replying_unassigned'),

  // SMTP (outbound)
  outMethod: mailboxOutMethodEnum('out_method').notNull().default('smtp'),
  outServer: text('out_server'),
  outPort: integer('out_port'),
  outUsername: text('out_username'),
  outPasswordEncrypted: text('out_password_encrypted'),
  outEncryption: mailboxOutEncryptionEnum('out_encryption').notNull().default('tls'),

  // IMAP (inbound)
  inServer: text('in_server'),
  inPort: integer('in_port').default(993),
  inUsername: text('in_username'),
  inPasswordEncrypted: text('in_password_encrypted'),
  inProtocol: mailboxInProtocolEnum('in_protocol').notNull().default('imap'),
  inEncryption: mailboxInEncryptionEnum('in_encryption').notNull().default('ssl'),
  inValidateCert: boolean('in_validate_cert').notNull().default(false),
  inImapFolders: jsonb('in_imap_folders').$type<string[]>(),
  imapSentFolder: text('imap_sent_folder'),
  imapLastUid: integer('imap_last_uid'),

  // Auto BCC
  autoBcc: text('auto_bcc'),

  // Signature / Before-reply header
  signature: text('signature'),
  beforeReply: text('before_reply'),

  // Auto-reply
  autoReplyEnabled: boolean('auto_reply_enabled').notNull().default(false),
  autoReplySubject: text('auto_reply_subject'),
  autoReplyMessage: text('auto_reply_message'),

  // Template style
  template: text('template', { enum: ['fancy', 'plain'] }).notNull().default('fancy'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Mailbox–User settings ────────────────────────────────────────────────────

export const mailboxUsers = pgTable('mailbox_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  mailboxId: uuid('mailbox_id').notNull().references(() => mailboxes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  afterSend: afterSendEnum('after_send').notNull().default('next'),
  hide: boolean('hide').notNull().default(false),     // hide from assign list
  mute: boolean('mute').notNull().default(false),     // mute notifications
  access: jsonb('access').$type<Record<string, boolean>>(),
}, (t) => [
  uniqueIndex('mailbox_users_unique').on(t.mailboxId, t.userId),
]);

// ─── Folders ──────────────────────────────────────────────────────────────────

export const folders = pgTable('folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  mailboxId: uuid('mailbox_id').notNull().references(() => mailboxes.id, { onDelete: 'cascade' }),
  // null = shared folder; set = personal folder (mine, starred)
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: folderTypeEnum('type').notNull(),
  activeCount: integer('active_count').notNull().default(0),
  totalCount: integer('total_count').notNull().default(0),
}, (t) => [
  uniqueIndex('folders_unique').on(t.mailboxId, t.userId, t.type),
]);

// ─── Customers ───────────────────────────────────────────────────────────────

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  company: text('company'),
  jobTitle: text('job_title'),
  avatarUrl: text('avatar_url'),
  phones: jsonb('phones').$type<string[]>(),
  websites: jsonb('websites').$type<string[]>(),
  socialProfiles: jsonb('social_profiles').$type<Record<string, string>>(),
  notes: text('notes'),
  address: text('address'),
  city: text('city'),
  country: text('country').default(''),  // ISO 3166-1 alpha-2
  channel: text('channel'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('customers_name_idx').on(t.firstName, t.lastName),
]);

// ─── Conversations ────────────────────────────────────────────────────────────

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  subject: text('subject').notNull(),
  type: conversationTypeEnum('type').notNull().default('email'),
  status: conversationStatusEnum('status').notNull().default('active'),
  state: conversationStateEnum('state').notNull().default('published'),

  mailboxId: uuid('mailbox_id').notNull().references(() => mailboxes.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  customerEmail: text('customer_email').notNull(),  // denormalized for fast lookup
  assigneeId: uuid('assignee_id').references(() => users.id),

  // Audit trail
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdByCustomerId: uuid('created_by_customer_id').references(() => customers.id),
  closedByUserId: uuid('closed_by_user_id').references(() => users.id),
  closedAt: timestamp('closed_at'),

  // CC/BCC stored as JSON arrays of email strings
  cc: jsonb('cc').$type<string[]>(),
  bcc: jsonb('bcc').$type<string[]>(),

  // Computed/denormalized for list rendering
  preview: text('preview'),
  threadsCount: integer('threads_count').notNull().default(0),
  hasAttachments: boolean('has_attachments').notNull().default(false),
  lastReplyAt: timestamp('last_reply_at'),
  lastReplyFrom: sourceViaEnum('last_reply_from'),
  firstReplyAt: timestamp('first_reply_at'),
  readByUser: boolean('read_by_user').notNull().default(false),
  userUpdatedAt: timestamp('user_updated_at'),

  sourceVia: sourceViaEnum('source_via').notNull().default('customer'),
  sourceType: sourceTypeEnum('source_type').notNull().default('email'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('conversations_mailbox_status_idx').on(t.mailboxId, t.status),
  index('conversations_mailbox_customer_idx').on(t.mailboxId, t.customerId),
  index('conversations_assignee_idx').on(t.assigneeId),
]);

// ─── Conversation–Folder mapping ──────────────────────────────────────────────
// Used for indirect membership (drafts, starred) where a conversation can be
// in multiple folders.

export const conversationFolders = pgTable('conversation_folders', {
  folderId: uuid('folder_id').notNull().references(() => folders.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
}, (t) => [
  uniqueIndex('conv_folder_unique').on(t.folderId, t.conversationId),
]);

// ─── Messages ─────────────────────────────────────────────────────────────────
// type=lineitem records system events (status change, assignee change, etc.) — these have no body.

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),

  type: messageTypeEnum('type').notNull(),
  state: messageStateEnum('state').notNull().default('published'),

  // For lineitems: what event occurred
  actionType: messageActionTypeEnum('action_type'),
  actionData: text('action_data'),  // e.g. assignee name, old mailbox id

  // Message content (null for lineitems)
  body: text('body'),
  bodyOriginal: text('body_original'),  // pre-edit version

  // Email addressing
  from: text('from'),
  to: jsonb('to').$type<string[]>(),
  cc: jsonb('cc').$type<string[]>(),
  bcc: jsonb('bcc').$type<string[]>(),
  headers: text('headers'),  // raw headers for debugging

  // Author — exactly one is set for non-lineitem messages
  authorCustomerId: uuid('author_customer_id').references(() => customers.id),
  authorUserId: uuid('author_user_id').references(() => users.id),
  editedByUserId: uuid('edited_by_user_id').references(() => users.id),
  editedAt: timestamp('edited_at'),

  // Flags
  first: boolean('first').notNull().default(false),  // first message in conversation
  hasAttachments: boolean('has_attachments').notNull().default(false),
  openedAt: timestamp('opened_at'),  // open tracking

  // Email threading headers
  emailMessageId: text('email_message_id').unique(),
  emailInReplyTo: text('email_in_reply_to'),

  // Source
  sourceVia: sourceViaEnum('source_via').notNull().default('customer'),
  sourceType: sourceTypeEnum('source_type').notNull().default('email'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('messages_conversation_idx').on(t.conversationId, t.type),
  index('messages_conversation_created_idx').on(t.conversationId, t.createdAt),
]);

// ─── Attachments ──────────────────────────────────────────────────────────────

export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  storageKey: text('storage_key').notNull(),
  embedded: boolean('embedded').notNull().default(false),  // inline image in body
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('attachments_message_embedded_idx').on(t.messageId, t.embedded),
]);

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#6366f1'),
});

export const conversationTags = pgTable('conversation_tags', {
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => [
  uniqueIndex('conv_tag_unique').on(t.conversationId, t.tagId),
]);

// ─── Saved Replies ────────────────────────────────────────────────────────────

export const savedReplies = pgTable('saved_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  body: text('body').notNull(),
  mailboxId: uuid('mailbox_id').references(() => mailboxes.id, { onDelete: 'cascade' }),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('saved_replies_mailbox_idx').on(t.mailboxId),
]);

// ─── Followers ────────────────────────────────────────────────────────────────

export const followers = pgTable('followers', {
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  addedByUserId: uuid('added_by_user_id').references(() => users.id),
}, (t) => [
  uniqueIndex('followers_unique').on(t.conversationId, t.userId),
]);

// ─── Send Logs ────────────────────────────────────────────────────────────────

export const sendLogs = pgTable('send_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id),
  userId: uuid('user_id').references(() => users.id),
  to: text('to').notNull(),
  mailType: sendLogMailTypeEnum('mail_type').notNull().default('email_to_customer'),
  status: sendLogStatusEnum('status').notNull().default('accepted'),
  statusMessage: text('status_message'),
  emailMessageId: text('email_message_id'),  // SMTP-assigned ID
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('send_logs_message_idx').on(t.messageId),
  index('send_logs_customer_idx').on(t.customerId, t.mailType, t.createdAt),
]);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  mailboxUsers: many(mailboxUsers),
  assignedConversations: many(conversations, { relationName: 'assignee' }),
  followers: many(followers),
}));

export const mailboxesRelations = relations(mailboxes, ({ many }) => ({
  folders: many(folders),
  mailboxUsers: many(mailboxUsers),
  conversations: many(conversations),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  mailbox: one(mailboxes, { fields: [folders.mailboxId], references: [mailboxes.id] }),
  user: one(users, { fields: [folders.userId], references: [users.id] }),
  conversationFolders: many(conversationFolders),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  mailbox: one(mailboxes, { fields: [conversations.mailboxId], references: [mailboxes.id] }),
  customer: one(customers, { fields: [conversations.customerId], references: [customers.id] }),
  assignee: one(users, { fields: [conversations.assigneeId], references: [users.id], relationName: 'assignee' }),
  messages: many(messages),
  tags: many(conversationTags),
  folders: many(conversationFolders),
  followers: many(followers),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  authorCustomer: one(customers, { fields: [messages.authorCustomerId], references: [customers.id] }),
  authorUser: one(users, { fields: [messages.authorUserId], references: [users.id] }),
  attachments: many(attachments),
  sendLogs: many(sendLogs),
}));
