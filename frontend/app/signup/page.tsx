"use client";
import { useState } from "react"; import Link from "next/link"; import { api } from "@/lib/api";
const signup = true;
export default function Page() {
  const [f, setF] = useState({ name: "", email: "", password: "" }); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); setBusy(true); setErr("");
    try { const r = await api(signup ? "/auth/signup" : "/auth/login", f); localStorage.setItem("sf_token", r.token); window.location.href = signup ? "/onboarding" : "/dashboard"; }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); } }
  return (<main className="mx-auto max-w-sm px-6 py-20"><h1 className="text-3xl font-semibold mb-6">{signup ? "Create your account" : "Welcome back"}</h1>
    <form onSubmit={submit} className="space-y-4">
      {signup && <label className="block text-sm">Name<input className="inp mt-1" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>}
      <label className="block text-sm">Email<input type="email" className="inp mt-1" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
      <label className="block text-sm">Password (8+ characters)<input type="password" minLength={8} className="inp mt-1" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
      {err && <p role="alert" className="text-sm" style={{ color: "#B96862" }}>{err}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Please wait..." : signup ? "Sign up" : "Log in"}</button></form>
    <p className="mt-4 text-sm text-muted">{signup ? <>Have an account? <Link href="/login" className="underline">Log in</Link></> : <>New here? <Link href="/signup" className="underline">Sign up</Link></>}</p></main>);
}
