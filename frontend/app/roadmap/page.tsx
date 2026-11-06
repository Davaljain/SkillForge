"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function Roadmap() {
  const [mods, setMods] = useState<any[]>([]); const [focus, setFocus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true); const [err, setErr] = useState("");
  async function load() { try { const [m, f] = await Promise.all([api("/roadmap"), api("/focus")]); setMods(m); setFocus(f); } catch (e: any) { setErr(e.message); } finally { setLoading(false); } }
  useEffect(() => { if (!localStorage.getItem("sf_token")) { window.location.href = "/login"; return; } load(); }, []);
  const done = mods.filter(m => m.status === "complete").length, pct = mods.length ? Math.round(done / mods.length * 100) : 0;
  if (loading) return <p className="p-8 text-muted">Building your roadmap...</p>;
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted">← Dashboard</Link>
      <div className="flex justify-between items-end mt-2 mb-4 flex-wrap gap-2"><h1 className="text-3xl font-semibold">My roadmap</h1><p className="text-sm text-muted">{done}/{mods.length} modules · {pct}%</p></div>
      <div className="h-1.5 bg-pale rounded mb-6"><div className="h-1.5 bg-sage rounded transition-all" style={{ width: `${pct}%` }} /></div>
      {err && <p role="alert" className="text-sm mb-4" style={{ color: "#B96862" }}>{err}</p>}
      {focus.length > 0 && <div className="card mb-6"><p className="text-sm font-medium mb-2">Extra focus from your job analyses</p><div className="flex flex-wrap gap-2">{focus.map(f => <span key={f} className="rounded-full px-3 py-1 text-xs" style={{ background: "#F1DDD3" }}>{f}</span>)}</div></div>}
      {!mods.length ? <div className="card text-center py-12"><p className="text-muted mb-4">No roadmap yet. Choose a target career first.</p><Link href="/dashboard" className="btn">Go to dashboard</Link></div> :
        <ol className="space-y-4">{mods.map((m, i) => (
          <li key={m.skillId} className="card">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div><p className="font-medium">{String(i + 1).padStart(2, "0")}. {m.title}</p><p className="text-sm text-muted">~{m.estimatedHours}h · priority {m.priority}</p></div>
              {m.status === "complete" ? <span className="text-sm" style={{ color: "#6F8F72" }}>✓ Complete</span> :
                <div className="flex gap-2"><Link href={`/assess?skill=${m.skillId}`} className="btn text-sm">Assessment</Link>
                  <button className="btn-outline text-sm" onClick={async () => { await api(`/roadmap/module/${m.skillId}/complete`, {}); load(); }}>Mark done</button></div>}
            </div>
            {m.lesson && <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted">Lesson plan</summary>
              <p className="mt-2">{m.lesson.about}</p>
              <p className="font-medium mt-2">Learning objectives</p><ul className="list-disc pl-5">{m.lesson.goals.map((g: string) => <li key={g}>{g}</li>)}</ul>
              <p className="font-medium mt-2">Resources</p><ul className="list-disc pl-5">{m.lesson.resources.map(([n, u]: string[]) => <li key={u}><a className="underline" href={u} target="_blank" rel="noreferrer">{n}</a></li>)}</ul>
              <p className="font-medium mt-2">Practice tasks</p><ul className="list-disc pl-5">{m.lesson.tasks.map((t: string) => <li key={t}>{t}</li>)}</ul>
              <p className="mt-2"><span className="font-medium">Mini project:</span> {m.lesson.project}</p></details>}
          </li>))}</ol>}
    </main>
  );
}
