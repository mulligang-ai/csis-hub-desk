import { requireAdmin } from "@/lib/csis/auth";
import { btnGhostCls, Card, PageHeader, inputCls } from "@/components/csis/ui";
import { updateMemberAction } from "../../actions";

export default async function TeamPage() {
  const { supabase, profile } = await requireAdmin();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active")
    .order("created_at");
  return (
    <>
      <PageHeader title="Team" />
      <p className="mb-4 text-sm text-muted">
        New sign-ups stay inactive until you tick “Active” here.
      </p>
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {members?.map((m) => (
            <li key={m.id}>
              <form action={updateMemberAction} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <input type="hidden" name="id" value={m.id} />
                <span>
                  <span className="font-bold text-heading">{m.full_name || m.email}</span>
                  <span className="block text-xs text-muted">{m.email}</span>
                </span>
                {m.id === profile.id ? (
                  <span className="text-xs text-muted">You ({m.role})</span>
                ) : (
                  <span className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-sm">
                      <input type="checkbox" name="active" defaultChecked={m.active} /> Active
                    </label>
                    <select name="role" defaultValue={m.role} className={`${inputCls} w-auto`}>
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button className={btnGhostCls}>Save</button>
                  </span>
                )}
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
