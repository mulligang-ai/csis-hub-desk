import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/csis/supabase/admin";

export const dynamic = "force-dynamic";

const load = async (slug: string) =>
  (
    await createAdminClient()
      .from("articles")
      .select("title, body, category")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
  ).data;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await load((await params).slug);
  return { title: a?.title ?? "Help docs" };
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const a = await load((await params).slug);
  if (!a) notFound();
  return (
    <main className="min-h-screen bg-mist">
      <article className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/support/docs" className="text-sm font-bold text-brand">← Help docs</Link>
        <p className="mt-4 text-xs font-bold text-muted uppercase">{a.category}</p>
        <h1 className="mt-1 mb-6 text-3xl">{a.title}</h1>
        <div className="whitespace-pre-wrap rounded-xl border border-line bg-white p-6 leading-relaxed">{a.body}</div>
        <p className="mt-6 text-sm text-muted">
          Still stuck? <Link href="/support" className="font-bold text-brand">Contact support</Link>.
        </p>
      </article>
    </main>
  );
}
