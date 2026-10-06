import type { Metadata } from "next";
import Link from "next/link";
import { submitTicket } from "./actions";
import { COMPANY_NAME, PRODUCT_NAME } from "@/lib/csis/constants";
import { btnCls, inputCls, labelCls, Notice } from "@/components/csis/ui";

export const metadata: Metadata = { title: "Support", alternates: { canonical: "/support" } };

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  return (
    <main className="min-h-screen bg-mist">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-sm font-bold text-brand">{COMPANY_NAME} · {PRODUCT_NAME}</p>
        <h1 className="mt-1 text-3xl">How can we help?</h1>
        <p className="mt-2 text-muted">
          Browse the <Link href="/support/docs" className="font-bold text-brand">help docs</Link> or send us a
          request below. You can also email us directly and we will open a ticket for you.
        </p>
        <form action={submitTicket} className="mt-8 space-y-4 rounded-2xl border border-line bg-white p-6 shadow-sm">
          {error && <Notice>{error}</Notice>}
          {sent && <Notice tone="info">Thanks — we have your message.</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelCls} htmlFor="name">Your name</label><input id="name" name="name" className={inputCls} /></div>
            <div><label className={labelCls} htmlFor="email">Email</label><input id="email" name="email" type="email" required className={inputCls} /></div>
          </div>
          <div><label className={labelCls} htmlFor="subject">Subject</label><input id="subject" name="subject" required className={inputCls} /></div>
          <div><label className={labelCls} htmlFor="body">How can we help?</label><textarea id="body" name="body" required rows={6} className={inputCls} /></div>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <button className={btnCls}>Submit request</button>
        </form>
      </div>
    </main>
  );
}
