CREATE TYPE "public"."after_send" AS ENUM('stay', 'next', 'folder');--> statement-breakpoint
CREATE TYPE "public"."conversation_state" AS ENUM('draft', 'published', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('active', 'pending', 'closed', 'spam');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('email', 'phone', 'chat', 'custom');--> statement-breakpoint
CREATE TYPE "public"."folder_type" AS ENUM('unassigned', 'mine', 'starred', 'drafts', 'assigned', 'closed', 'deleted', 'spam');--> statement-breakpoint
CREATE TYPE "public"."mailbox_from_name" AS ENUM('mailbox', 'user', 'custom');--> statement-breakpoint
CREATE TYPE "public"."mailbox_in_encryption" AS ENUM('none', 'ssl', 'tls', 'starttls');--> statement-breakpoint
CREATE TYPE "public"."mailbox_in_protocol" AS ENUM('imap', 'pop3');--> statement-breakpoint
CREATE TYPE "public"."mailbox_out_encryption" AS ENUM('none', 'ssl', 'tls');--> statement-breakpoint
CREATE TYPE "public"."mailbox_out_method" AS ENUM('php_mail', 'sendmail', 'smtp');--> statement-breakpoint
CREATE TYPE "public"."mailbox_ticket_assignee" AS ENUM('keep', 'anyone', 'replying_unassigned', 'replying');--> statement-breakpoint
CREATE TYPE "public"."mailbox_ticket_status" AS ENUM('keep', 'active', 'pending', 'closed');--> statement-breakpoint
CREATE TYPE "public"."message_action_type" AS ENUM('status_changed', 'assignee_changed', 'moved_from_mailbox', 'merged', 'imported', 'customer_changed', 'deleted', 'restored');--> statement-breakpoint
CREATE TYPE "public"."message_state" AS ENUM('draft', 'published', 'hidden', 'review');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('customer', 'agent', 'note', 'lineitem', 'chat');--> statement-breakpoint
CREATE TYPE "public"."send_log_mail_type" AS ENUM('email_to_customer', 'user_notification', 'auto_reply', 'invite', 'password_changed', 'test', 'alert');--> statement-breakpoint
CREATE TYPE "public"."send_log_status" AS ENUM('accepted', 'send_error', 'delivery_success', 'delivery_error', 'opened', 'clicked', 'unsubscribed', 'complained');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('email', 'web', 'api');--> statement-breakpoint
CREATE TYPE "public"."source_via" AS ENUM('customer', 'user');--> statement-breakpoint
CREATE TYPE "public"."user_invite_state" AS ENUM('activated', 'sent', 'not_invited');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'agent');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled', 'deleted');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"embedded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_folders" (
	"folder_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_tags" (
	"conversation_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"type" "conversation_type" DEFAULT 'email' NOT NULL,
	"status" "conversation_status" DEFAULT 'active' NOT NULL,
	"state" "conversation_state" DEFAULT 'published' NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"customer_email" text NOT NULL,
	"assignee_id" uuid,
	"created_by_user_id" uuid,
	"created_by_customer_id" uuid,
	"closed_by_user_id" uuid,
	"closed_at" timestamp,
	"cc" jsonb,
	"bcc" jsonb,
	"preview" text,
	"threads_count" integer DEFAULT 0 NOT NULL,
	"has_attachments" boolean DEFAULT false NOT NULL,
	"last_reply_at" timestamp,
	"last_reply_from" "source_via",
	"first_reply_at" timestamp,
	"read_by_user" boolean DEFAULT false NOT NULL,
	"user_updated_at" timestamp,
	"source_via" "source_via" DEFAULT 'customer' NOT NULL,
	"source_type" "source_type" DEFAULT 'email' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"company" text,
	"job_title" text,
	"avatar_url" text,
	"phones" jsonb,
	"websites" jsonb,
	"social_profiles" jsonb,
	"notes" text,
	"address" text,
	"city" text,
	"country" text DEFAULT '',
	"channel" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"user_id" uuid,
	"type" "folder_type" NOT NULL,
	"active_count" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "followers" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"added_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "mailbox_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"after_send" "after_send" DEFAULT 'next' NOT NULL,
	"hide" boolean DEFAULT false NOT NULL,
	"mute" boolean DEFAULT false NOT NULL,
	"access" jsonb
);
--> statement-breakpoint
CREATE TABLE "mailboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"aliases" text,
	"aliases_reply" boolean DEFAULT false NOT NULL,
	"from_name" "mailbox_from_name" DEFAULT 'mailbox' NOT NULL,
	"from_name_custom" text,
	"ticket_status" "mailbox_ticket_status" DEFAULT 'pending' NOT NULL,
	"ticket_assignee" "mailbox_ticket_assignee" DEFAULT 'replying_unassigned' NOT NULL,
	"out_method" "mailbox_out_method" DEFAULT 'smtp' NOT NULL,
	"out_server" text,
	"out_port" integer,
	"out_username" text,
	"out_password_encrypted" text,
	"out_encryption" "mailbox_out_encryption" DEFAULT 'tls' NOT NULL,
	"in_server" text,
	"in_port" integer DEFAULT 993,
	"in_username" text,
	"in_password_encrypted" text,
	"in_protocol" "mailbox_in_protocol" DEFAULT 'imap' NOT NULL,
	"in_encryption" "mailbox_in_encryption" DEFAULT 'ssl' NOT NULL,
	"in_validate_cert" boolean DEFAULT false NOT NULL,
	"in_imap_folders" jsonb,
	"imap_sent_folder" text,
	"imap_last_uid" integer,
	"auto_bcc" text,
	"signature" text,
	"before_reply" text,
	"auto_reply_enabled" boolean DEFAULT false NOT NULL,
	"auto_reply_subject" text,
	"auto_reply_message" text,
	"template" text DEFAULT 'fancy' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mailboxes_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"type" "message_type" NOT NULL,
	"state" "message_state" DEFAULT 'published' NOT NULL,
	"action_type" "message_action_type",
	"action_data" text,
	"body" text,
	"body_original" text,
	"from" text,
	"to" jsonb,
	"cc" jsonb,
	"bcc" jsonb,
	"headers" text,
	"author_customer_id" uuid,
	"author_user_id" uuid,
	"edited_by_user_id" uuid,
	"edited_at" timestamp,
	"first" boolean DEFAULT false NOT NULL,
	"has_attachments" boolean DEFAULT false NOT NULL,
	"opened_at" timestamp,
	"email_message_id" text,
	"email_in_reply_to" text,
	"source_via" "source_via" DEFAULT 'customer' NOT NULL,
	"source_type" "source_type" DEFAULT 'email' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "messages_email_message_id_unique" UNIQUE("email_message_id")
);
--> statement-breakpoint
CREATE TABLE "send_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"customer_id" uuid,
	"user_id" uuid,
	"to" text NOT NULL,
	"mail_type" "send_log_mail_type" DEFAULT 'email_to_customer' NOT NULL,
	"status" "send_log_status" DEFAULT 'accepted' NOT NULL,
	"status_message" text,
	"email_message_id" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'agent' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"invite_state" "user_invite_state" DEFAULT 'not_invited' NOT NULL,
	"invite_hash" text,
	"avatar_url" text,
	"job_title" text,
	"phone" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"locale" text,
	"permissions" jsonb,
	"locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_folders" ADD CONSTRAINT "conversation_folders_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_folders" ADD CONSTRAINT "conversation_folders_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_tags" ADD CONSTRAINT "conversation_tags_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_tags" ADD CONSTRAINT "conversation_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_customer_id_customers_id_fk" FOREIGN KEY ("created_by_customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followers" ADD CONSTRAINT "followers_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followers" ADD CONSTRAINT "followers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followers" ADD CONSTRAINT "followers_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_users" ADD CONSTRAINT "mailbox_users_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_users" ADD CONSTRAINT "mailbox_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_customer_id_customers_id_fk" FOREIGN KEY ("author_customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_logs" ADD CONSTRAINT "send_logs_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_logs" ADD CONSTRAINT "send_logs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_logs" ADD CONSTRAINT "send_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_message_embedded_idx" ON "attachments" USING btree ("message_id","embedded");--> statement-breakpoint
CREATE UNIQUE INDEX "conv_folder_unique" ON "conversation_folders" USING btree ("folder_id","conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conv_tag_unique" ON "conversation_tags" USING btree ("conversation_id","tag_id");--> statement-breakpoint
CREATE INDEX "conversations_mailbox_status_idx" ON "conversations" USING btree ("mailbox_id","status");--> statement-breakpoint
CREATE INDEX "conversations_mailbox_customer_idx" ON "conversations" USING btree ("mailbox_id","customer_id");--> statement-breakpoint
CREATE INDEX "conversations_assignee_idx" ON "conversations" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE UNIQUE INDEX "folders_unique" ON "folders" USING btree ("mailbox_id","user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "followers_unique" ON "followers" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mailbox_users_unique" ON "mailbox_users" USING btree ("mailbox_id","user_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","type");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "send_logs_message_idx" ON "send_logs" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "send_logs_customer_idx" ON "send_logs" USING btree ("customer_id","mail_type","created_at");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");