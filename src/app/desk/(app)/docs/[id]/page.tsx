import { notFound } from "next/navigation";
import { requireAgent } from "@/lib/csis/auth";
import { btnCls, btnGhostCls, Card, inputCls, labelCls, Notice, PageHeader } from "@/components/csis/ui";
import { deleteArticleAction, saveArticleAction } from "../../../actions";

export default async function ArticleEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireAgent();
  const isNew = id === "new";
  const { data: a } = isNew
    ? { data: null }
    : await supabase.from("articles").select("*").eq("id", id).maybeSingle();
  if (!isNew && !a) notFound();

  return (
    <>
      <PageHeader title={isNew ? "New article" : "Edit article"} />
      <Card className="max-w-3xl">
        {error && <Notice>{error}</Notice>}
        <form action={saveArticleAction} className="space-y-3">
          <input type="hidden" name="id" value={a?.id ?? ""} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls} htmlFor="title">Title</label><input id="title" name="title" required defaultValue={a?.title} className={inputCls} /></div>
            <div><label className={labelCls} htmlFor="category">Category</label><input id="category" name="category" defaultValue={a?.category ?? "General"} className={inputCls} /></div>
          </div>
          <div><label className={labelCls} htmlFor="slug">URL slug (optional)</label><input id="slug" name="slug" defaultValue={a?.slug} className={inputCls} /></div>
          <div><label className={labelCls} htmlFor="body">Body</label><textarea id="body" name="body" rows={14} defaultValue={a?.body} className={inputCls} /></div>
          <label className="flex items-center gap-2 text-sm font-semibold text-heading">
            <input type="checkbox" name="published" defaultChecked={a?.published} /> Published
          </label>
          <button className={btnCls}>Save article</button>
        </form>
        {a && (
          <form action={deleteArticleAction} className="mt-4">
            <input type="hidden" name="id" value={a.id} />
            <button className={btnGhostCls}>Delete article</button>
          </form>
        )}
      </Card>
    </>
  );
}
