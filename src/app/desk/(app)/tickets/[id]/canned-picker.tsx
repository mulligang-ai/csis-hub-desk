"use client";

import type { CannedResponse } from "@/lib/csis/types";
import { inputCls } from "@/components/csis/ui";

/** Inserts a canned response into the reply box, filling in {{name}}. */
export function CannedPicker({
  canned,
  customerName,
}: {
  canned: CannedResponse[];
  customerName: string;
}) {
  if (!canned.length) return null;
  return (
    <select
      aria-label="Insert canned response"
      className={`${inputCls} w-auto`}
      defaultValue=""
      onChange={(e) => {
        const c = canned.find((x) => x.id === e.target.value);
        const box = document.getElementById("reply-body") as HTMLTextAreaElement | null;
        if (c && box) {
          const first = customerName.split(" ")[0] || "there";
          box.value = (box.value ? box.value + "\n\n" : "") + c.body.replaceAll("{{name}}", first);
          box.focus();
        }
        e.target.value = "";
      }}
    >
      <option value="">Insert canned response…</option>
      {canned.map((c) => (
        <option key={c.id} value={c.id}>{c.title}</option>
      ))}
    </select>
  );
}
