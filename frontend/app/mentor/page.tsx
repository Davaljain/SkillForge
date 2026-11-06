"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Msg = { role: "user"|"assistant"; content: string; at?: string };

export default function Mentor() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if (!localStorage.getItem("sf_token")) { window.location.href="/login"; return; }
    api("/mentor/history").then((h:Msg[])=>{ setMessages(h); setLoading(false); }).catch(()=>setLoading(false));
  },[]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); },[messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const msg = input.trim(); if(!msg) return;
    setInput(""); setBusy(true);
    setMessages(m=>[...m,{role:"user",content:msg}]);
    try {
      const r = await api("/mentor/chat",{message:msg});
      setMessages(m=>[...m,{role:"assistant",content:r.reply}]);
    } catch(e:any) { setMessages(m=>[...m,{role:"assistant",content:e.message}]); }
    setBusy(false);
  }

  const PROMPTS = ["What should I learn next?","Explain React hooks simply","How do I prepare for a technical interview?","What projects should I build?"];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 flex flex-col h-screen">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/dashboard" className="text-sm text-muted">← Dashboard</Link>
        <h1 className="text-2xl font-semibold">AI Mentor</h1>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {loading && <p className="text-muted text-sm">Loading conversation...</p>}
        {!loading && messages.length===0 && (
          <div className="card text-center py-8">
            <p className="font-medium mb-2">Ask me anything about your career journey.</p>
            <p className="text-sm text-muted mb-4">I know your skill gaps and roadmap.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {PROMPTS.map(p=><button key={p} onClick={()=>setInput(p)} className="text-xs border border-line rounded-full px-3 py-1.5">{p}</button>)}
            </div>
          </div>
        )}
        {messages.map((m,i)=>(
          <div key={i} className={`flex ${m.role==="user"?"justify-end":""}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role==="user"?"text-white":"card"}`}
              style={m.role==="user"?{background:"#718A78"}:{}}>
              {m.role==="assistant"&&<p className="text-xs text-muted mb-1">SkillForge Mentor</p>}
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {busy&&<div className="flex"><div className="card px-4 py-3 text-sm text-muted">Thinking...</div></div>}
        <div ref={bottomRef}/>
      </div>
      <form onSubmit={send} className="flex gap-2 pt-3 border-t border-line">
        <input className="inp flex-1" aria-label="Message" placeholder="Ask your mentor..." value={input} onChange={e=>setInput(e.target.value)} required />
        <button className="btn" disabled={busy}>Send</button>
      </form>
    </main>
  );
}
