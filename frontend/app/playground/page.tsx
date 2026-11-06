"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const CHALLENGES = [
  { id: "sumEvens", title: "Sum of evens", prompt: "Write sumEvens(arr) that returns the sum of the even numbers.", starter: "function sumEvens(arr) {\n  \n}", tests: [[[[1, 2, 3, 4]], 6], [[[]], 0], [[[7, 9]], 0]] },
  { id: "reverseWords", title: "Reverse words", prompt: "Write reverseWords(s) that reverses the order of words in a string.", starter: "function reverseWords(s) {\n  \n}", tests: [[["a b c"], "c b a"], [["hello"], "hello"]] },
];
const WORKER = `onmessage = (e) => { const { code, fn, tests } = e.data; const logs = [];
const console = { log: (...a) => logs.push(a.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" ")) };
try { const f = new Function("console", code + (fn ? "\\nreturn typeof " + fn + " === 'function' ? " + fn + " : undefined;" : "")); const r = f(console);
  if (fn) { if (!r) throw new Error("Function " + fn + " was not found"); postMessage({ logs, results: tests.map(([args, exp]) => { let got; try { got = r(...args); } catch (err) { got = "Error: " + err.message; } return { ok: JSON.stringify(got) === JSON.stringify(exp), got, exp }; }) }); }
  else postMessage({ logs });
} catch (err) { postMessage({ logs, error: String(err.message || err) }); } };`;

export default function Playground() {
  const [cid, setCid] = useState("free");
  const ch = CHALLENGES.find(c => c.id === cid);
  const [code, setCode] = useState("console.log('Hello, SkillForge');");
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState("");
  useEffect(() => { if (!localStorage.getItem("sf_token")) window.location.href = "/login"; }, []);
  function pick(id: string) { setCid(id); setOut(null); setHelp(""); setCode(CHALLENGES.find(c => c.id === id)?.starter ?? "console.log('Hello, SkillForge');"); }
  // Code runs in a Web Worker in your own browser (no DOM, no server), killed after 3 seconds.
  function run(submit: boolean) {
    setBusy(true); setOut(null); setHelp("");
    const url = URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" })); const w = new Worker(url);
    const done = (r: any) => { clearTimeout(t); w.terminate(); URL.revokeObjectURL(url); setOut(r); setBusy(false); };
    const t = setTimeout(() => done({ logs: [], error: "Timed out after 3 seconds. Check for an infinite loop." }), 3000);
    w.onmessage = e => done(e.data); w.onerror = e => done({ logs: [], error: e.message });
    w.postMessage({ code, fn: submit && ch ? ch.id : null, tests: submit && ch ? ch.tests : [] });
  }
  async function aiDebug() {
    setHelp("Thinking...");
    try { const r = await api("/mentor/chat", { message: `Debug my JavaScript. Code:\n${code.slice(0, 1200)}\nOutput/error: ${JSON.stringify(out).slice(0, 400)}` }); setHelp(r.reply); } catch (e: any) { setHelp(e.message); }
  }
  const passed = out?.results?.filter((r: any) => r.ok).length;
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted">← Dashboard</Link>
      <h1 className="text-3xl font-semibold mt-2 mb-1">Coding playground</h1>
      <p className="text-muted text-sm mb-4">JavaScript only for now. Your code runs in a sandboxed worker in your browser, never on our server.</p>
      <div className="flex gap-2 flex-wrap mb-4">{[{ id: "free", title: "Free run" }, ...CHALLENGES].map(c => <button key={c.id} onClick={() => pick(c.id)} className={`rounded-full px-4 py-1.5 text-sm border ${cid === c.id ? "bg-sage text-white border-sage" : "border-line"}`}>{c.title}</button>)}</div>
      {ch && <p className="card text-sm mb-3">{ch.prompt}</p>}
      <textarea className="inp h-56 font-mono text-sm" aria-label="Code editor" spellCheck={false} value={code} onChange={e => setCode(e.target.value)} />
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="btn" disabled={busy} onClick={() => run(false)}>Run</button>
        {ch && <button className="btn" style={{ background: "#C98268" }} disabled={busy} onClick={() => run(true)}>Submit against tests</button>}
        {out && <button className="btn-outline" onClick={aiDebug}>AI debug</button>}
      </div>
      {busy && <p className="text-sm text-muted mt-3">Running...</p>}
      {out && <section className="card mt-4 text-sm space-y-2">
        {out.error && <p style={{ color: "#B96862" }}>{out.error}</p>}
        {out.logs?.length > 0 && <pre className="whitespace-pre-wrap">{out.logs.join("\n")}</pre>}
        {out.results && <><p className="font-medium">{passed}/{out.results.length} tests passed</p>{out.results.map((r: any, i: number) => <p key={i} className="text-xs" style={{ color: r.ok ? "#6F8F72" : "#B96862" }}>{r.ok ? "✓" : "✗"} expected {JSON.stringify(r.exp)}, got {JSON.stringify(r.got)}</p>)}</>}
        {!out.error && !out.logs?.length && !out.results && <p className="text-muted">No output.</p>}
      </section>}
      {help && <section className="card mt-4 text-sm whitespace-pre-wrap">{help}</section>}
    </main>
  );
}
