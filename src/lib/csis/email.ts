import { supportEmail } from "./constants";

type Outgoing = {
  to: string;
  subject: string;
  text: string;
  /** Message-ID of the mail we are replying to, for client threading. */
  inReplyTo?: string | null;
};

/** Sends via Resend. Returns false (and never throws) if mail isn't configured or fails. */
export async function sendEmail(mail: Outgoing): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CSIS_FROM_EMAIL ?? supportEmail(),
        to: [mail.to],
        reply_to: supportEmail(),
        subject: mail.subject,
        text: mail.text,
        headers: mail.inReplyTo
          ? { "In-Reply-To": mail.inReplyTo, References: mail.inReplyTo }
          : undefined,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
