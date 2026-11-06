"use client";
import { useEffect, useState } from "react"; import Link from "next/link"; import { api } from "@/lib/api";
export default function Profile() {
  const [me, setMe] = useState<any>(null); const [f, setF] = useState<any>({}); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!localStorage.getItem("sf_token")) { window.location.href = "/login"; return; }
    api("/me").then(u => { setMe(u); setF({ college: u.college ?? "", degree: u.degree ?? "", gradYear: u.gradYear ?? "", semester: u.semester ?? "" }); }); }, []);
  if (!me) return <p className="p-8 text-muted">Loading...</p>;
  async function save() { setBusy(true); setMsg("");
    try { await api("/profile", { college: f.college || undefined, degree: f.degree || undefined, gradYear: f.gradYear ? Number(f.gradYear) : undefined, semester: f.semester ? Number(f.semester) : undefined }, "PUT"); setMsg("Saved."); }
    catch (e: any) { setMsg(e.message); } finally { setBusy(false); } }
  return (<main className="mx-auto max-w-lg px-6 py-12"><Link href="/dashboard" className="text-sm text-muted">← Dashboard</Link>
    <h1 className="text-3xl font-semibold mt-2 mb-6">Profile & settings</h1>
    <div className="card space-y-3">
      <p className="text-sm"><span className="text-muted">Name:</span> {me.name}</p><p className="text-sm"><span className="text-muted">Email:</span> {me.email}</p>
      <p className="text-sm"><span className="text-muted">Target career:</span> {me.career?.name ?? "Not set"}</p>
      <label className="block text-sm">College<input className="inp mt-1" value={f.college} onChange={e => setF({ ...f, college: e.target.value })} /></label>
      <label className="block text-sm">Degree<input className="inp mt-1" value={f.degree} onChange={e => setF({ ...f, degree: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-3"><label className="block text-sm">Graduation year<input type="number" className="inp mt-1" value={f.gradYear} onChange={e => setF({ ...f, gradYear: e.target.value })} /></label>
        <label className="block text-sm">Semester<input type="number" className="inp mt-1" value={f.semester} onChange={e => setF({ ...f, semester: e.target.value })} /></label></div>
      <button className="btn" disabled={busy} onClick={save}>{busy ? "Saving..." : "Save changes"}</button>
      {msg && <p className="text-sm text-muted" role="status">{msg}</p>}
      <button className="text-sm underline" onClick={() => { localStorage.removeItem("sf_token"); window.location.href = "/"; }}>Log out</button>
    </div></main>);
}
