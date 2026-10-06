import { requireAgent } from "@/lib/csis/auth";
import { btnCls, btnGhostCls, Card, inputCls, labelCls, PageHeader } from "@/components/csis/ui";
import { deleteCannedAction, saveCannedAction } from "../../actions";

export default async function CannedPage() {
  const { supabase } = await requireAgent();
  const { data } = await supabase.from("canned_responses").select("*").order("title");
  return (
    <>
      <PageHeader title="Canned responses" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg">New canned response</h2>
          <form action={saveCannedAction} className="space-y-3">
            <div><label className={labelCls} htmlFor="title">Title</label><input id="title" name="title" required className={inputCls} /></div>
            <div>
              <label className={labelCls} htmlFor="body">Message</label>
              <textarea id="body" name="body" required rows={6} className={inputCls} placeholder={"Hi {{name}},\n\n…"} />
              <p className="mt-1 text-xs text-muted">{"{{name}} is replaced with the customer's first name."}</p>
            </div>
            <button className={btnCls}>Save</button>
          </form>
        </Card>
        <div className="space-y-3">
          {data?.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-heading">{c.title}</h3>
                <form action={deleteCannedAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className={btnGhostCls}>Delete</button>
                </form>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap text-muted">{c.body}</p>
            </Card>
          ))}
          {!data?.length && <p className="text-sm text-muted">No canned responses yet.</p>}
        </div>
      </div>
    </>
  );
}
