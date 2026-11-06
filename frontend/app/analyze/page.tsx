"use client";
import { useState } from "react"; import Link from "next/link"; import { api, upload } from "@/lib/api";
const tabs = ["Job description", "Resume", "GitHub"] as const;
const Chips = ({ items, tone }: { items: string[]; tone?: string }) => <div className="flex flex-wrap gap-2">{items.length ? items.map(i => <span key={i} className="rounded-full px-3 py-1 text-xs" style={{ background: tone ?? "#E4EBE3" }}>{i}</span>) : <span className="text-sm text-muted">None</span>}</div>;
export default function Analyze() {
  const [tab, setTab] = useState<typeof tabs[number]>("Job description"); const [text, setText] = useState(""); const [user, setUser] = useState("");
  const [res, setRes] = useState<any>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState("");
  async function run(label: string, fn: () => Promise<any>) { setBusy(label); setErr(""); setRes(null); try { setRes(await fn()); } catch (e: any) { setErr(e.message); } setBusy(""); }
  return (<main className="mx-auto max-w-3xl px-6 py-10"><Link href="/dashboard" className="text-sm text-muted">← Dashboard</Link>
    <h1 className="text-3xl font-semibold mt-2 mb-6">Analyze</h1>
    <div role="tablist" className="flex gap-2 mb-6">{tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setRes(null); setErr(""); }} className={`rounded-full px-4 py-1.5 text-sm border ${tab === t ? "bg-sage text-white border-sage" : "border-line"}`}>{t}</button>)}</div>
    <section className="card space-y-3">
      {tab === "Job description" && <><textarea className="inp h-40" aria-label="Job description" placeholder="Paste a job description..." value={text} onChange={e => setText(e.target.value)} />
        <button className="btn" disabled={!!busy} onClick={() => run("Analyzing job...", () => api("/jobs/analyze", { text }))}>Analyze job</button></>}
      {tab === "Resume" && <label className="block text-sm">Upload PDF or DOCX (max 3 MB)<input type="file" accept=".pdf,.docx" className="block mt-2" onChange={e => { const f = e.target.files?.[0]; if (f) run("Analyzing resume...", () => upload("/resume/analyze", f)); }} /></label>}
      {tab === "GitHub" && <><input className="inp" aria-label="GitHub username" placeholder="GitHub username" value={user} onChange={e => setUser(e.target.value)} />
        <button className="btn" disabled={!!busy} onClick={() => run("Checking GitHub...", () => api("/github/analyze", { username: user }))}>Analyze profile</button></>}
      {busy && <p className="text-sm text-muted">{busy}</p>}{err && <p role="alert" className="text-sm" style={{ color: "#B96862" }}>{err}</p>}</section>
    {res && <section className="card mt-4 space-y-4">
      {tab === "Job description" && <><p className="text-3xl font-semibold">{res.matchPercent}% match</p><p className="text-sm text-muted">Experience: {res.experience}</p>
        <div><p className="text-sm mb-1">You have</p><Chips items={res.youHave} /></div><div><p className="text-sm mb-1">Preparation gaps</p><Chips items={res.gaps} tone="#F1DDD3" /></div></>}
      {tab === "Resume" && <><div className="flex gap-8"><div><p className="text-3xl font-semibold">{res.atsScore}%</p><p className="text-sm text-muted">ATS readability</p></div><div><p className="text-3xl font-semibold">{res.roleAlignment}%</p><p className="text-sm text-muted">Role alignment</p></div></div>
        <div><p className="text-sm mb-1">Skills found</p><Chips items={res.skillsFound} /></div><div><p className="text-sm mb-1">Missing keywords</p><Chips items={res.missingKeywords} tone="#F1DDD3" /></div></>}
      {tab === "GitHub" && <><p className="text-sm">{res.repos} original repos · {res.activeLast90Days} active in 90 days</p><Chips items={Object.entries(res.languages).map(([k, v]) => `${k} (${v})`)} />
        <ul className="text-sm space-y-1">{res.topRepos.map((r: any) => <li key={r.name}><a className="underline" href={r.url} target="_blank" rel="noreferrer">{r.name}</a> · ★ {r.stars}</li>)}</ul><p className="text-xs text-muted">{res.note}</p></>}
      <div><p className="font-medium mb-1">Recommendations</p><ul className="list-disc pl-5 text-sm space-y-1">{res.recommendations.length ? res.recommendations.map((r: string) => <li key={r}>{r}</li>) : <li>Looking good. No changes suggested.</li>}</ul></div></section>}
  </main>);
}
