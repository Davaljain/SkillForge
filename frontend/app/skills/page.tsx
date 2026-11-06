"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const AREAS: Record<string, [string, string]> = { skills: ["Skills", "/assess"], projects: ["Projects", "/projects"], dsa: ["DSA", "/interview"], resume: ["Resume", "/analyze"], github: ["GitHub", "/analyze"], interview: ["Interview", "/interview"] };
const col = (p: number) => p >= 80 ? "#6F8F72" : p >= 50 ? "#718A78" : "#B88A4A";
function Trend({ pts }: { pts: number[] }) {
  if (pts.length < 2) return <p className="text-sm text-muted">Take at least two assessments to see your growth.</p>;
  const w = 560, h = 120, x = (i: number) => i * (w / (pts.length - 1)), y = (v: number) => h - v / 100 * h;
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Assessment scores over time"><polyline fill="none" stroke="#718A78" strokeWidth="2" points={pts.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />{pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#C98268" />)}</svg>;
}
export default function SkillsPage() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => {
    if (!localStorage.getItem("sf_token")) { window.location.href = "/login"; return; }
    Promise.all([api("/skill-profile"), api("/gaps"), api("/readiness"), api("/assessments/history")]).then(([profile, gaps, ready, hist]) => setD({ profile, gaps, ready, hist })).catch(e => setErr(e.message));
  }, []);
  if (err) return <p className="p-8 text-sm" role="alert" style={{ color: "#B96862" }}>{err}</p>;
  if (!d) return <p className="p-8 text-muted">Loading your skill profile...</p>;
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted">← Dashboard</Link>
      <h1 className="text-3xl font-semibold mt-2 mb-6">Skill profile</h1>
      <section className="card mb-6"><p className="text-4xl font-semibold">{d.ready.score}%</p><p className="text-sm text-muted mb-4">Career readiness</p>
        <div className="grid gap-3 sm:grid-cols-2">{Object.entries(AREAS).map(([k, [label, href]]) => { const v = d.ready.breakdown?.[k];
          return <div key={k}><div className="flex justify-between text-sm mb-1"><span>{label}</span>{v == null ? <Link href={href} className="text-xs underline text-muted">Not measured yet</Link> : <span style={{ color: col(v) }}>{v}%</span>}</div>
            <div className="h-1.5 bg-pale rounded"><div className="h-1.5 rounded transition-all" style={{ width: `${v ?? 0}%`, background: col(v ?? 0) }} /></div></div>; })}</div>
        <p className="text-xs text-muted mt-4">{d.ready.note}</p></section>
      <section className="card mb-6"><h2 className="font-semibold mb-3">Assessment history</h2><Trend pts={d.hist.map((h: any) => h.pct)} /></section>
      {d.profile.length > 0 && <section className="card mb-6"><h2 className="font-semibold mb-4">Your skills</h2><div className="space-y-3">{[...d.profile].sort((a: any, b: any) => b.level - a.level).map((s: any) => <div key={s.skillId}><div className="flex justify-between text-sm mb-1"><span>{s.skill}</span><span style={{ color: col(s.level) }}>{s.level}%</span></div><div className="h-1.5 bg-pale rounded"><div className="h-1.5 rounded" style={{ width: `${s.level}%`, background: col(s.level) }} /></div></div>)}</div></section>}
      {d.gaps.length > 0 && <section className="card mb-6"><h2 className="font-semibold mb-4">Skill gaps for your target career</h2><div className="space-y-3">{d.gaps.map((g: any) => <div key={g.skillId} className="flex items-center gap-3"><div className="flex-1"><div className="flex justify-between text-sm mb-1"><span>{g.skill}</span><span className="text-muted">{g.current} → {g.required} · {g.priority}</span></div><div className="h-1.5 bg-pale rounded"><div className="h-1.5 bg-sage rounded" style={{ width: `${Math.min(100, g.current / g.required * 100)}%` }} /></div></div><Link href={`/assess?skill=${g.skillId}`} className="btn text-xs">Test</Link></div>)}</div></section>}
      {!d.profile.length && !d.gaps.length && <div className="card text-center py-10"><p className="text-muted mb-4">No assessment completed yet.</p><Link href="/assess" className="btn">Take your first assessment</Link></div>}
    </main>
  );
}
