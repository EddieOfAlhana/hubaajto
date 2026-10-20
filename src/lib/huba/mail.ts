/**
 * Outgoing mail over plain SMTP, so any mailbox works: the client's own (vs1.abplusz.hu), a
 * Gmail app password, or Resend/Postmark SMTP. Without SMTP_HOST nothing is sent and the caller
 * is told so; Huba's order then reaches Zoltán through Alfred instead.
 *
 *   SMTP_HOST, SMTP_PORT (465 = TLS, 587 = STARTTLS), SMTP_USER, SMTP_PASS
 *   SMTP_FROM        e.g. "Huba ajtó weboldal <web@hubaajto.hu>" (defaults to SMTP_USER)
 *   HUBA_ORDER_TO    recipient of orders (defaults to LEAD_DESTINATION_EMAIL, then info@szerx.hu)
 */

import nodemailer from "nodemailer";
import { CONTACT } from "../../data/site";

export type MailAttachment = { filename: string; contentType: string; content: Buffer };

export function configured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export function orderRecipient(): string {
  return process.env.HUBA_ORDER_TO || process.env.LEAD_DESTINATION_EMAIL || CONTACT.email;
}

export async function send(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}): Promise<"sent" | "not-configured"> {
  if (!configured()) return "not-configured";
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments,
  });
  return "sent";
}
