"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/csis/supabase/server";
import { createAdminClient } from "@/lib/csis/supabase/admin";
import { requireAdmin, requireAgent } from "@/lib/csis/auth";
import { sendEmail } from "@/lib/csis/email";
import { portalTicketUrl, upsertCustomer } from "@/lib/csis/tickets";
import { PRIORITIES, STATUSES, TYPES, ticketRef } from "@/lib/csis/constants";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const oneOf = <T extends { value: string }>(list: T[], v: string) =>
  list.some((x) => x.value === v);

// ------------------------------------------------------------------ auth
export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: text(formData, "email"),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect("/desk/login?error=" + encodeURIComponent(error.message));
  redirect("/desk");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: text(formData, "email"),
    password: String(formData.get("password") ?? ""),
    options: { data: { full_name: text(formData, "name") } },
  });
  if (error) redirect("/desk/login?mode=signup&error=" + encodeURIComponent(error.message));
  // With email confirmation on there is no session yet.
  if (!data.session) redirect("/desk/login?confirm=1");
  redirect("/desk");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/desk/login");
}

// --------------------------------------------------------------- tickets
export async function createTicketAction(formData: FormData) {
  const { supabase, profile } = await requireAgent();
  const email = text(formData, "email").toLowerCase();
  const subject = text(formData, "subject");
  const body = text(formData, "body");
  if (!email.includes("@") || !subject || !body) {
    redirect("/desk/tickets/new?error=Customer+email%2C+subject+and+message+are+required");
  }
  const priority = text(formData, "priority");
  const customerId = await upsertCustomer(createAdminClient(), email, text(formData, "name"));

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      subject,
      customer_id: customerId,
      source: "agent",
      status: "waiting",
      priority: oneOf(PRIORITIES, priority) ? priority : "normal",
      assignee_id: profile.id,
      first_response_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  await supabase
    .from("messages")
    .insert({ ticket_id: ticket.id, kind: "reply", author_id: profile.id, body });
  await supabase
    .from("ticket_events")
    .insert({ ticket_id: ticket.id, actor_id: profile.id, description: "Ticket created by agent" });
  await sendEmail({
    to: email,
    subject: `[${ticketRef(ticket.number)}] ${subject}`,
    text: withFooter(body, profile.signature, portalTicketUrl(ticket)),
  });
  redirect(`/desk/tickets/${ticket.id}`);
}

const withFooter = (body: string, signature: string, link: string) =>
  `${body}${signature ? `\n\n${signature}` : ""}\n\n---\nView this conversation: ${link}`;

export async function replyAction(formData: FormData) {
  const { supabase, profile } = await requireAgent();
  const ticketId = text(formData, "ticketId");
  const body = text(formData, "body");
  const kind = text(formData, "kind") === "note" ? "note" : "reply";
  if (!body) return;

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, customers(email, name)")
    .eq("id", ticketId)
    .single();
  if (!ticket) return;

  await supabase
    .from("messages")
    .insert({ ticket_id: ticketId, kind, author_id: profile.id, body });

  const patch: Record<string, unknown> = {};
  if (kind === "reply") {
    patch.last_message_at = new Date().toISOString();
    if (!ticket.first_response_at) patch.first_response_at = patch.last_message_at;
    const status = text(formData, "status");
    if (oneOf(STATUSES, status)) {
      patch.status = status;
      patch.solved_at = status === "solved" ? patch.last_message_at : null;
    }
    // Replying claims an unassigned ticket.
    if (!ticket.assignee_id) patch.assignee_id = profile.id;
  }
  if (Object.keys(patch).length) await supabase.from("tickets").update(patch).eq("id", ticketId);

  if (kind === "reply") {
    const { data: last } = await supabase
      .from("messages")
      .select("email_message_id")
      .eq("ticket_id", ticketId)
      .not("email_message_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    await sendEmail({
      to: ticket.customers.email,
      subject: `Re: [${ticketRef(ticket.number)}] ${ticket.subject}`,
      text: withFooter(body, profile.signature, portalTicketUrl(ticket)),
      inReplyTo: last?.email_message_id ? `<${last.email_message_id}>` : null,
    });
  }
  revalidatePath(`/desk/tickets/${ticketId}`);
}

export async function updateTicketAction(formData: FormData) {
  const { supabase, profile } = await requireAgent();
  const ticketId = text(formData, "ticketId");
  const { data: before } = await supabase.from("tickets").select("*").eq("id", ticketId).single();
  if (!before) return;

  const patch: Record<string, unknown> = {};
  const events: string[] = [];
  const status = text(formData, "status");
  if (oneOf(STATUSES, status) && status !== before.status) {
    patch.status = status;
    patch.solved_at = status === "solved" ? new Date().toISOString() : null;
    events.push(`Status changed to ${status.replace("_", " ")}`);
  }
  const priority = text(formData, "priority");
  if (oneOf(PRIORITIES, priority) && priority !== before.priority) {
    patch.priority = priority;
    events.push(`Priority changed to ${priority}`);
  }
  const type = text(formData, "type");
  if (oneOf(TYPES, type) && type !== before.type) {
    patch.type = type;
    events.push(`Type changed to ${type}`);
  }
  const assignee = text(formData, "assignee") || null;
  if (assignee !== before.assignee_id) {
    patch.assignee_id = assignee;
    events.push(assignee ? "Ticket reassigned" : "Ticket unassigned");
  }
  const tags = [
    ...new Set(
      text(formData, "tags")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 20);
  if (tags.join(",") !== before.tags.join(",")) {
    patch.tags = tags;
    events.push("Tags updated");
  }
  if (!Object.keys(patch).length) return;

  await supabase.from("tickets").update(patch).eq("id", ticketId);
  await supabase
    .from("ticket_events")
    .insert(events.map((description) => ({ ticket_id: ticketId, actor_id: profile.id, description })));
  revalidatePath(`/desk/tickets/${ticketId}`);
  revalidatePath("/desk/tickets");
}

// ------------------------------------------------------------- customers
export async function updateCustomerAction(formData: FormData) {
  const { supabase } = await requireAgent();
  const id = text(formData, "id");
  await supabase
    .from("customers")
    .update({
      name: text(formData, "name"),
      phone: text(formData, "phone"),
      company: text(formData, "company"),
      notes: text(formData, "notes"),
    })
    .eq("id", id);
  revalidatePath(`/desk/customers/${id}`);
}

// ------------------------------------------------------ canned responses
export async function saveCannedAction(formData: FormData) {
  const { supabase, profile } = await requireAgent();
  const title = text(formData, "title");
  const body = text(formData, "body");
  if (!title || !body) return;
  await supabase.from("canned_responses").insert({ title, body, created_by: profile.id });
  revalidatePath("/desk/canned");
}

export async function deleteCannedAction(formData: FormData) {
  const { supabase } = await requireAgent();
  await supabase.from("canned_responses").delete().eq("id", text(formData, "id"));
  revalidatePath("/desk/canned");
}

// ------------------------------------------------------------- help docs
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export async function saveArticleAction(formData: FormData) {
  const { supabase } = await requireAgent();
  const id = text(formData, "id");
  const title = text(formData, "title");
  if (!title) return;
  const row = {
    title,
    slug: slugify(text(formData, "slug") || title) || "article",
    category: text(formData, "category") || "General",
    body: text(formData, "body"),
    published: formData.get("published") === "on",
  };
  const { error } = id
    ? await supabase.from("articles").update(row).eq("id", id)
    : await supabase.from("articles").insert(row);
  if (error) {
    redirect(`/desk/docs/${id || "new"}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/desk/docs");
  revalidatePath("/support/docs");
  redirect("/desk/docs");
}

export async function deleteArticleAction(formData: FormData) {
  const { supabase } = await requireAgent();
  await supabase.from("articles").delete().eq("id", text(formData, "id"));
  revalidatePath("/desk/docs");
  revalidatePath("/support/docs");
  redirect("/desk/docs");
}

// ------------------------------------------------------------------ team
export async function updateMemberAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = text(formData, "id");
  // Don't let an admin lock themselves out of the desk.
  if (id === profile.id) return;
  const { error } = await (await createClient())
    .from("profiles")
    .update({
      active: formData.get("active") === "on",
      role: text(formData, "role") === "admin" ? "admin" : "agent",
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/desk/team");
}

/** Own profile edits go through the service role so agents can't change role/active. */
export async function updateProfileAction(formData: FormData) {
  const { profile } = await requireAgent();
  await createAdminClient()
    .from("profiles")
    .update({ full_name: text(formData, "name"), signature: String(formData.get("signature") ?? "").trim() })
    .eq("id", profile.id);
  revalidatePath("/desk", "layout");
}
