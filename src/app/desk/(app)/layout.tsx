import type { Metadata } from "next";
import Link from "next/link";
import { requireAgent } from "@/lib/csis/auth";
import { PRODUCT_NAME } from "@/lib/csis/constants";
import { signOut } from "../actions";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  robots: { index: false, follow: false },
};

const nav = [
  { href: "/desk", label: "Dashboard" },
  { href: "/desk/tickets?view=mine", label: "My tickets" },
  { href: "/desk/tickets?view=unassigned", label: "Unassigned" },
  { href: "/desk/tickets?view=active", label: "All active" },
  { href: "/desk/tickets?view=waiting", label: "Waiting on customer" },
  { href: "/desk/tickets?view=solved", label: "Solved" },
  { href: "/desk/tickets?view=all", label: "All tickets" },
  { href: "/desk/customers", label: "Customers" },
  { href: "/desk/canned", label: "Canned responses" },
  { href: "/desk/docs", label: "Help docs" },
];

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAgent();
  return (
    <div className="flex min-h-screen flex-col bg-mist md:flex-row">
      <aside className="shrink-0 border-b border-line bg-white md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <Link href="/desk" className="block text-lg font-extrabold text-brand">
            CSIS <span className="text-heading">Hub Desk</span>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          <Link
            href="/desk/tickets/new"
            className="mb-2 rounded-lg bg-brand px-3 py-2 text-center text-sm font-bold whitespace-nowrap text-white hover:bg-brand-deep"
          >
            + New ticket
          </Link>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-heading hover:bg-mist"
            >
              {n.label}
            </Link>
          ))}
          {profile.role === "admin" && (
            <Link
              href="/desk/team"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-heading hover:bg-mist"
            >
              Team
            </Link>
          )}
        </nav>
        <div className="hidden border-t border-line px-5 py-4 text-sm md:block">
          <Link href="/desk/profile" className="block font-bold text-heading hover:text-brand">
            {profile.full_name || profile.email}
          </Link>
          <p className="text-xs text-muted capitalize">{profile.role}</p>
          <form action={signOut} className="mt-2">
            <button className="text-xs font-semibold text-muted underline">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
