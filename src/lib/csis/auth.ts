import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** Resolves the signed-in, activated agent or redirects away. */
export async function requireAgent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/desk/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active, signature")
    .eq("id", data.user.id)
    .single();
  if (!profile?.active) redirect("/desk/login?pending=1");
  return { supabase, profile: profile as Profile };
}

export async function requireAdmin() {
  const ctx = await requireAgent();
  if (ctx.profile.role !== "admin") redirect("/desk");
  return ctx;
}
