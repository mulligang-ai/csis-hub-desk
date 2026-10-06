"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/csis/supabase/admin";
import { addCustomerMessage, createTicket } from "@/lib/csis/tickets";

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

export async function submitTicket(formData: FormData) {
  // Honeypot: real people never fill the hidden "website" field.
  if (text(formData, "website", 200)) redirect("/support?sent=1");

  const email = text(formData, "email", 200).toLowerCase();
  const subject = text(formData, "subject", 300);
  const body = text(formData, "body", 10000);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !subject || !body) {
    redirect("/support?error=Please+fill+in+your+email%2C+a+subject+and+a+message");
  }
  const { ticket } = await createTicket(createAdminClient(), {
    email,
    name: text(formData, "name", 120),
    subject,
    body,
    source: "portal",
  });
  redirect(`/support/tickets/${ticket.access_token}?new=1`);
}

export async function customerReply(formData: FormData) {
  const token = text(formData, "token", 100);
  const body = text(formData, "body", 10000);
  if (!body) return;
  const db = createAdminClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("id, status")
    .eq("access_token", token)
    .maybeSingle();
  if (!ticket) return;
  await addCustomerMessage(db, ticket, body);
  revalidatePath(`/support/tickets/${token}`);
}
