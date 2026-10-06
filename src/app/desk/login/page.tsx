import type { Metadata } from "next";
import Link from "next/link";
import { signIn, signUp } from "../actions";
import { PRODUCT_NAME } from "@/lib/csis/constants";
import { btnCls, inputCls, labelCls, Notice } from "@/components/csis/ui";

export const metadata: Metadata = {
  title: `Sign in · ${PRODUCT_NAME}`,
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const signup = sp.mode === "signup";
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h1 className="text-2xl text-brand">CSIS Hub Desk</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          {signup ? "Create an agent account" : "Sign in to the support desk"}
        </p>
        {sp.error && <Notice>{sp.error}</Notice>}
        {sp.pending && (
          <Notice tone="info">
            Your account is waiting for an admin to activate it. Check back soon.
          </Notice>
        )}
        {sp.confirm && (
          <Notice tone="info">Check your email to confirm your address, then sign in.</Notice>
        )}
        <form action={signup ? signUp : signIn} className="space-y-4">
          {signup && (
            <div>
              <label className={labelCls} htmlFor="name">Name</label>
              <input id="name" name="name" required className={inputCls} />
            </div>
          )}
          <div>
            <label className={labelCls} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className={inputCls}
            />
          </div>
          <button className={`${btnCls} w-full`}>{signup ? "Create account" : "Sign in"}</button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          {signup ? (
            <Link href="/desk/login" className="font-bold text-brand">Back to sign in</Link>
          ) : (
            <>
              New agent?{" "}
              <Link href="/desk/login?mode=signup" className="font-bold text-brand">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
