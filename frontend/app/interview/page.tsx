"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Turn = { question: string; feedback: string; score: number };
type SessionState = { sessionId: string; question: string; type: string; career: string };
const TYPES = [
  { id:"technical", label:"Technical", desc:"Coding, system design, and role-specific concepts" },
  { id:"behavioral", label:"Behavioral", desc:"STAR-format questions about past experience" },
  { id:"hr", label:"HR / Motivation", desc:"Culture fit, goals, and soft skills" },
  { id:"dsa", label:"DSA", desc:"Data structures and algorithms challenges" },
];

export default function Interview() {
  const [phase, setPhase] = useState<"pick"|"active"|"done">("pick");
  const [session, setSession] = useState<SessionState|null>(null);
  const [currentQ, setCurrentQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [feedback, setFeedback] = useState("");
  const [overallScore, setOverallScore] = useState<number|null>(null);
  const [turnsLeft, setTurnsLeft] = useState(5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!localStorage.getItem("sf_token")) { window.location.href="/login"; return; }
    api("/interview/sessions").then(setHistory).catch(()=>{});
  },[]);

  async function start(type: string) {
    setBusy(true); setErr("");
    try {
      const r = await api("/interview/start", { type });
      setSession(r); setCurrentQ(r.question); setTurnsLeft(5); setTurns([]); setFeedback(""); setOverallScore(null);
      setPhase("active");
    } catch (e:any) { setErr(e.message); }
    setBusy(false);
  }

  async function submitAnswer() {
    if (!session||!answer.trim()) return;
    setBusy(true); setErr("");
    try {
      const r = await api("/interview/answer", { sessionId: session.sessionId, answer: answer.trim(), question: currentQ });
      setTurns(t => [...t, { question: currentQ, feedback: r.feedback, score: r.score }]);
      setFeedback(r.feedback);
      setAnswer("");
      if (r.done) { setOverallScore(r.overallScore); setPhase("done"); }
      else { setCurrentQ(r.nextQuestion); setTurnsLeft(r.turnsLeft); }
    } catch (e:any) { setErr(e.message); }
    setBusy(false);
  }

  const scoreColor = (s:number) => s>=8?"#6F8F72":s>=5?"#B88A4A":"#B96862";

  if (phase==="pick") return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted">← Dashboard</Link>
      <h1 className="text-3xl font-semibold mt-2 mb-2">AI Interview Practice</h1>
      <p className="text-muted mb-6">5 questions per session. Real feedback on each answer.</p>
      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        {TYPES.map(t=><button key={t.id} onClick={()=>start(t.id)} disabled={busy} className="card text-left hover:border-sage transition-colors">
          <p className="font-medium">{t.label}</p><p className="text-sm text-muted mt-1">{t.desc}</p>
        </button>)}
      </div>
      {err&&<p role="alert" className="text-sm" style={{color:"#B96862"}}>{err}</p>}
      {busy&&<p className="text-sm text-muted">Preparing your interview...</p>}
      {history.length>0&&<section className="card mt-6"><h2 className="font-semibold mb-3">Past sessions</h2>
        {history.map(s=><div key={s.id} className="flex justify-between text-sm mb-2">
          <span className="capitalize">{s.type} · {s.career}</span>
          <span style={{color:scoreColor(s.overallScore??0)}}>{s.overallScore!=null?`${s.overallScore}/10`:s.status}</span>
        </div>)}
      </section>}
    </main>
  );

  if (phase==="done") return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-semibold mb-2">Interview complete</h1>
      <p className="text-muted mb-6">Overall score: <span className="font-semibold text-ink" style={{color:scoreColor(overallScore??0)}}>{overallScore}/10</span></p>
      <div className="space-y-4 mb-6">
        {turns.map((t,i)=><div key={i} className="card"><p className="text-sm font-medium mb-1">Q{i+1}: {t.question}</p>
          <p className="text-sm text-muted">{t.feedback}</p><p className="text-sm mt-1" style={{color:scoreColor(t.score)}}>Score: {t.score}/10</p></div>)}
      </div>
      <div className="flex gap-3 flex-wrap">
        <button className="btn" onClick={()=>setPhase("pick")}>Start another</button>
        <Link href="/dashboard" className="rounded-xl border border-line px-4 py-2">Dashboard</Link>
      </div>
    </main>
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted capitalize">{session?.type} · {session?.career}</p>
        <p className="text-sm text-muted">{5-turnsLeft}/5 answered · {turnsLeft} left</p>
      </div>
      <div className="h-1.5 bg-pale rounded mb-8"><div className="h-1.5 bg-terra rounded transition-all" style={{width:`${(5-turnsLeft)/5*100}%`}}/></div>
      <div className="card mb-4"><p className="font-medium">{currentQ}</p></div>
      {feedback&&<div className="card mb-4" style={{borderColor:"#718A78"}}><p className="text-sm text-muted mb-1">Feedback on last answer</p><p className="text-sm">{feedback}</p></div>}
      <textarea className="inp h-32 mb-3" aria-label="Your answer" placeholder="Type your answer here..." value={answer} onChange={e=>setAnswer(e.target.value)} />
      {err&&<p role="alert" className="text-sm mb-2" style={{color:"#B96862"}}>{err}</p>}
      <button className="btn w-full" onClick={submitAnswer} disabled={busy||!answer.trim()}>{busy?"Evaluating...":"Submit answer"}</button>
    </main>
  );
}
