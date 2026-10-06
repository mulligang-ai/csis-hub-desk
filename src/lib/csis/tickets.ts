import { createAdminClient } from "./supabase/admin";
import { siteUrl, ticketRef } from "./constants";
import { sendEmail } from "./email";
import type { Ticket } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

export async function upsertCustomer(db: Admin, email: string, name: string) {
  const clean = email.trim().toLowerCase();
  const { data: existing } = await db
    .from("customers")
    .select("id, name")
    .ilike("email", clean.replace(/[%_]/g, "\\$&"))
    .maybeSingle();
  if (existing) {
    if (!existing.name && name) {
      await db.from("customers").update({ name }).eq("id", existing.id);
    }
    return existing.id as string;
  }
  const { data, error } = await db
    .from("customers")
    .insert({ email: clean, name })
    .select("id")
    .single();
  if (error) {
    // Lost a race with a concurrent insert for the same address.
    const { data: again } = await db
      .from("customers")
      .select("id")
      .ilike("email", clean.replace(/[%_]/g, "\\$&"))
      .single();
    if (again) return again.id as string;
    throw error;
  }
  return data.id as string;
}

/** The customer-facing link to a ticket (no login needed). */
export const portalTicketUrl = (t: Pick<Ticket, "access_token">) =>
  `${siteUrl()}/support/tickets/${t.access_token}`;

export async function createTicket(
  db: Admin,
  input: {
    email: string;
    name: string;
    subject: string;
    body: string;
    source: "email" | "portal";
    emailMessageId?: string | null;
  },
) {
  const customerId = await upsertCustomer(db, input.email, input.name);
  const { data: ticket, error } = await db
    .from("tickets")
    .insert({
      subject: input.subject.slice(0, 300) || "(no subject)",
      customer_id: customerId,
      source: input.source,
    })
    .select("*")
    .single();
  if (error) throw error;
  const { data: message, error: msgErr } = await db
    .from("messages")
    .insert({
      ticket_id: ticket.id,
      kind: "customer",
      body: input.body,
      email_message_id: input.emailMessageId ?? null,
    })
    .select("id")
    .single();
  if (msgErr) throw msgErr;

  await sendEmail({
    to: input.email,
    subject: `[${ticketRef(ticket.number)}] ${ticket.subject}`,
    inReplyTo: input.emailMessageId,
    text:
      `Hi${input.name ? ` ${input.name.split(" ")[0]}` : ""},\n\n` +
      `Thanks for getting in touch. We've logged your request as ${ticketRef(ticket.number)} ` +
      `and a member of the team will reply shortly.\n\n` +
      `You can follow it here any time: ${portalTicketUrl(ticket)}\n\n` +
      `Just reply to this email to add more detail.`,
  });
  return { ticket: ticket as Ticket, messageId: message.id as string };
}

/** Adds a customer message and bounces the ticket back to Active if it was parked. */
export async function addCustomerMessage(
  db: Admin,
  ticket: Pick<Ticket, "id" | "status">,
  body: string,
  emailMessageId?: string | null,
) {
  const { data: message, error } = await db
    .from("messages")
    .insert({
      ticket_id: ticket.id,
      kind: "customer",
      body,
      email_message_id: emailMessageId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  const reopen = ticket.status !== "active" && ticket.status !== "on_hold";
  await db
    .from("tickets")
    .update({
      last_message_at: new Date().toISOString(),
      ...(reopen ? { status: "active", solved_at: null } : {}),
    })
    .eq("id", ticket.id);
  if (reopen) {
    await db
      .from("ticket_events")
      .insert({ ticket_id: ticket.id, description: "Customer replied — ticket reopened" });
  }
  return message.id as string;
}
