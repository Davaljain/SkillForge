"use client";
import { useEffect, useState } from "react"; import { api } from "@/lib/api";
const CONF = [["New to this",0],["Some exposure",25],["Comfortable",50],["Confident",75]] as const;
export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({ college: "", degree: "", gradYear: "", semester: "" });
  const [careers, setCareers] = useState<any[]>([]); const [careerId, setCareerId] = useState("");
  const [skills, setSkills] = useState<any[]>([]); const [picked, setPicked] = useState<Record<string, number>>({});
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!localStorage.getItem("sf_token")) { window.location.href = "/login"; return; }
    api("/careers").then(setCareers); api("/skills").then(setSkills); }, []);
  async function next() { setErr(""); setBusy(true);
    try {
      if (step === 1) await api("/profile", { college: profile.college || undefined, degree: profile.degree || undefined,
        gradYear: profile.gradYear ? Number(profile.gradYear) : undefined, semester: profile.semester ? Number(profile.semester) : undefined }, "PUT");
      if (step === 2) { if (!careerId) throw new Error("Choose a target career to continue."); await api("/career/select", { careerId }); }
      if (step === 4) await api("/skills/self-report", { levels: Object.entries(picked).map(([skillId, level]) => ({ skillId, level })) });
      if (step === 4) { window.location.href = "/dashboard"; return; }
      setStep(step + 1);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return (<main className="mx-auto max-w-2xl px-6 py-14">
    <p className="text-sm text-muted mb-2">Step {step} of 4</p>
    <div className="h-1 bg-pale rounded mb-8"><div className="h-1 bg-sage rounded transition-all" style={{ width: `${step / 4 * 100}%` }} /></div>
    {step === 1 && <section><h1 className="text-2xl font-semibold mb-4">Tell us about yourself</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">College<input className="inp mt-1" value={profile.college} onChange={e => setProfile({ ...profile, college: e.target.value })} /></label>
        <label className="text-sm">Degree<input className="inp mt-1" value={profile.degree} onChange={e => setProfile({ ...profile, degree: e.target.value })} /></label>
        <label className="text-sm">Graduation year<input type="number" className="inp mt-1" value={profile.gradYear} onChange={e => setProfile({ ...profile, gradYear: e.target.value })} /></label>
        <label className="text-sm">Current semester<input type="number" className="inp mt-1" value={profile.semester} onChange={e => setProfile({ ...profile, semester: e.target.value })} /></label>
      </div></section>}
    {step === 2 && <section><h1 className="text-2xl font-semibold mb-4">What career are you targeting?</h1>
      <div className="grid gap-3 sm:grid-cols-2">{careers.map(c => <button key={c.id} onClick={() => setCareerId(c.id)} className="card text-left" style={careerId === c.id ? { borderColor: "#718A78", background: "#E4EBE3" } : {}}>{c.name}</button>)}</div></section>}
    {step === 3 && <section><h1 className="text-2xl font-semibold mb-4">What do you already know?</h1><p className="text-sm text-muted mb-4">Pick the technologies you have some experience with. You'll confirm your level next.</p>
      <div className="flex flex-wrap gap-2">{skills.map(s => <button key={s.id} onClick={() => setPicked(p => p[s.id] !== undefined ? Object.fromEntries(Object.entries(p).filter(([k]) => k !== s.id)) : { ...p, [s.id]: 25 })}
        className="rounded-full px-3 py-1.5 text-sm border" style={picked[s.id] !== undefined ? { background: "#718A78", color: "#fff", borderColor: "#718A78" } : { borderColor: "#E5E1D8" }}>{s.name}</button>)}</div></section>}
    {step === 4 && <section><h1 className="text-2xl font-semibold mb-4">How confident are you?</h1>
      {Object.keys(picked).length === 0 && <p className="text-sm text-muted">No technologies selected — that's fine, your roadmap will start from the fundamentals.</p>}
      {Object.keys(picked).map(id => { const name = skills.find(s => s.id === id)?.name; return (<div key={id} className="mb-4"><p className="text-sm font-medium mb-1">{name}</p>
        <div className="flex gap-2">{CONF.map(([label, val]) => <button key={label} onClick={() => setPicked({ ...picked, [id]: val })} className="rounded-lg border px-2.5 py-1 text-xs" style={picked[id] === val ? { background: "#C98268", color: "#fff", borderColor: "#C98268" } : { borderColor: "#E5E1D8" }}>{label}</button>)}</div></div>); })}</section>}
    {err && <p role="alert" className="text-sm mt-4" style={{ color: "#B96862" }}>{err}</p>}
    <div className="flex justify-between mt-8">
      {step > 1 ? <button className="rounded-xl border border-line px-4 py-2" onClick={() => setStep(step - 1)}>Back</button> : <span />}
      <button className="btn" disabled={busy} onClick={next}>{busy ? "Please wait..." : step === 4 ? "Generate my career plan" : "Continue"}</button>
    </div></main>);
}
