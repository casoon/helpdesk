import nodemailer from 'nodemailer';
import { createDb, decrypt } from '@casoon/helpdesk-db';
import { mailboxes } from '@casoon/helpdesk-db/schema';
import { eq } from 'drizzle-orm';

const db = createDb(process.env.DATABASE_URL!);

// Cache transports per mailbox to avoid re-creating connections
const transports = new Map<string, nodemailer.Transporter>();

export async function sendEmail(opts: {
  mailboxId: string;
  to: string;
  subject: string;
  html: string;
  inReplyTo?: string;
}) {
  const [box] = await db
    .select()
    .from(mailboxes)
    .where(eq(mailboxes.id, opts.mailboxId))
    .limit(1);

  if (!box) throw new Error(`Mailbox ${opts.mailboxId} not found`);

  let transport = transports.get(box.id);

  if (!transport) {
    const pass = decrypt(box.outPasswordEncrypted!);
    transport = nodemailer.createTransport({
      host: box.outServer!,
      port: box.outPort ?? 587,
      secure: box.outEncryption === 'ssl',
      auth: { user: box.outUsername!, pass },
    });
    transports.set(box.id, transport);
  }

  await transport.sendMail({
    from: `"${box.name}" <${box.email}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    inReplyTo: opts.inReplyTo,
    references: opts.inReplyTo,
  });
}
