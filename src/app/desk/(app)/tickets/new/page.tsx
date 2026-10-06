import { requireAgent } from "@/lib/csis/auth";
import { PRIORITIES } from "@/lib/csis/constants";
import { btnCls, Card, inputCls, labelCls, Notice, PageHeader } from "@/components/csis/ui";
import { createTicketAction } from "../../../actions";

export default async function NewTicket({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAgent();
  const { error } = await searchParams;
  return (
    <>
      <PageHeader title="New ticket" />
      <Card className="max-w-2xl">
        {error && <Notice>{error}</Notice>}
        <p className="mb-4 text-sm text-muted">
          Opens a ticket for a customer and emails them your first message.
        </p>
        <form action={createTicketAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="email">Customer email</label>
              <input id="email" name="email" type="email" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="name">Customer name</label>
              <input id="name" name="name" className={inputCls} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <div>
              <label className={labelCls} htmlFor="subject">Subject</label>
              <input id="subject" name="subject" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="priority">Priority</label>
              <select id="priority" name="priority" defaultValue="normal" className={inputCls}>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="body">Message</label>
            <textarea id="body" name="body" required rows={8} className={inputCls} />
          </div>
          <button className={btnCls}>Create &amp; send</button>
        </form>
      </Card>
    </>
  );
}
