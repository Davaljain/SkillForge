"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function Projects() {
  const [ps, setPs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!localStorage.getItem("sf_token")) { window.location.href = "/login"; return; } api("/projects").then(setPs).finally(() => setLoading(false)); }, []);
  async function toggle(p: any) { await api("/projects/complete", { name: p.name, done: !p.done }); setPs(ps.map(x => x.name === p.name ? { ...x, done: !x.done } : x)); }
  if (loading) return <p className="p-8 text-muted">Finding projects for your skill gaps...</p>;
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted">← Dashboard</Link>
      <h1 className="text-3xl font-semibold mt-2 mb-1">Recommended projects</h1>
      <p className="text-muted mb-6">Matched to your skill gaps. Completing projects raises your readiness (3 projects = full marks for that area).</p>
      <div className="grid gap-4 sm:grid-cols-2">{ps.map(p => (
        <div key={p.name} className="card flex flex-col"><h2 className="font-semibold">{p.name}</h2><p className="text-sm text-muted mt-1 flex-1">{p.desc}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">{p.techs.map((t: string) => <span key={t} className="text-xs rounded-full px-2.5 py-0.5" style={{ background: "#E4EBE3", color: "#718A78" }}>{t}</span>)}</div>
          <div className="flex justify-between items-center mt-3"><span className="text-xs text-muted">~{p.hours} hours</span>
            <button onClick={() => toggle(p)} className={p.done ? "btn" : "btn-outline"} style={{ padding: ".35rem .8rem", fontSize: ".8rem" }}>{p.done ? "✓ Completed" : "Mark complete"}</button></div></div>))}</div>
      {!ps.length && <div className="card text-center py-12"><p className="text-muted">Pick a career and take an assessment to get project recommendations.</p></div>}
    </main>
  );
}
