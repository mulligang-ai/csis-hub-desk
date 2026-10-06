import { requireAgent } from "@/lib/csis/auth";
import { btnCls, Card, inputCls, labelCls, PageHeader } from "@/components/csis/ui";
import { updateProfileAction } from "../../actions";

export default async function ProfilePage() {
  const { profile } = await requireAgent();
  return (
    <>
      <PageHeader title="Your profile" />
      <Card className="max-w-xl">
        <form action={updateProfileAction} className="space-y-3">
          <p className="text-sm text-muted">{profile.email}</p>
          <div><label className={labelCls} htmlFor="name">Name</label><input id="name" name="name" defaultValue={profile.full_name} className={inputCls} /></div>
          <div>
            <label className={labelCls} htmlFor="signature">Email signature</label>
            <textarea id="signature" name="signature" rows={4} defaultValue={profile.signature} className={inputCls} />
            <p className="mt-1 text-xs text-muted">Added to the end of every reply you send.</p>
          </div>
          <button className={btnCls}>Save</button>
        </form>
      </Card>
    </>
  );
}
