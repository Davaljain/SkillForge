"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

function Assess() {
  const sp = useSearchParams();
  const [a, setA] = useState<any>(null);
  const [ans, setAns] = useState<Record<string, number>>({});
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("sf_token")) { window.location.href = "/login"; return; }
    api("/assessments/start", { skillId: sp.get("skill") ?? undefined }).then(setA).catch(e => setErr(e.message));
  }, [sp]);
  async function submit() {
    const missing = a.questions.filter((q: any) => ans[q.id] === undefined).length;
    if (missing && !confirm(`${missing} question(s) unanswered. They will count as wrong. Submit anyway?`)) return;
    setBusy(true); setErr("");
    try { setRes(await api("/assessments/submit", { skillId: a.skillId, answers: a.questions.map((q: any) => ({ questionId: q.id, choice: ans[q.id] ?? -1 })) })); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  if (!a) return err
    ? <main className="p-8"><p role="alert" className="text-sm" style={{ color: "#B96862" }}>{err}</p><Link href="/dashboard" className="btn inline-block mt-4">Back to dashboard</Link></main>
    : <p className="p-8 text-muted">Preparing assessment...</p>;
  if (res) return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted">← Dashboard</Link>
      <h1 className="text-3xl font-semibold mt-2">{res.correct}/{res.total} correct</h1>
      <p className="mt-2 text-muted">{a.skillName} level is now {res.level}%. {res.nextStep}</p>
      <ul className="mt-6 space-y-3">{res.review.map((r: any) => (
        <li key={r.id} className="card text-sm"><p className="font-medium mb-2">{r.prompt}</p>
          {r.options.map((o: string, j: number) => <p key={j} className="text-xs py-0.5" style={{ color: j === r.answer ? "#6F8F72" : "#6F716B", fontWeight: j === r.answer ? 600 : 400 }}>{j === r.answer ? "✓ " : ""}{o}{ans[r.id] === j && j !== r.answer ? "  ← your answer" : ""}</p>)}
          <p className="text-xs text-muted mt-2">{r.explanation}</p></li>))}</ul>
      <div className="flex gap-3 mt-6 flex-wrap"><Link href="/dashboard" className="btn">Back to dashboard</Link><Link href="/roadmap" className="rounded-xl border border-line px-4 py-2">View roadmap</Link></div>
    </main>);
  const answered = Object.keys(ans).length, total = a.questions.length;
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-semibold">{a.skillName} assessment</h1><p className="text-sm text-muted">{answered}/{total} answered</p></div>
      <div className="h-1.5 bg-pale rounded mb-6"><div className="h-1.5 bg-terra rounded transition-all" style={{ width: `${total ? answered / total * 100 : 0}%` }} /></div>
      {a.questions.map((q: any, i: number) => (
        <fieldset key={q.id} className="card mb-4"><legend className="sr-only">Question {i + 1}</legend>
          <p className="font-medium mb-3 text-sm">{i + 1}. {q.prompt}</p>
          {q.options.map((o: string, j: number) => <label key={j} className="flex gap-2 text-sm mb-1"><input type="radio" name={q.id} checked={ans[q.id] === j} onChange={() => setAns({ ...ans, [q.id]: j })} />{o}</label>)}
        </fieldset>))}
      {err && <p role="alert" className="text-sm mb-3" style={{ color: "#B96862" }}>{err}</p>}
      <button className="btn w-full" disabled={busy} onClick={submit}>{busy ? "Submitting..." : "Submit assessment"}</button>
    </main>);
}
export default function Page() { return <Suspense fallback={<p className="p-8">Loading...</p>}><Assess /></Suspense>; }
