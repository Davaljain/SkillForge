"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const NAV = [
  { href:"/dashboard", label:"Dashboard" },
  { href:"/roadmap",   label:"Roadmap" },
  { href:"/skills",    label:"Skills" },
  { href:"/assess",    label:"Assessment" },
  { href:"/mentor",    label:"AI Mentor" },
  { href:"/interview", label:"Interview" },
  { href:"/projects",  label:"Projects" },
  { href:"/playground", label:"Playground" },
  { href:"/analyze",   label:"Analyze" },
  { href:"/profile",   label:"Profile" },
];

function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="fixed top-4 left-4 z-50 md:hidden rounded-lg border border-line bg-cream p-2" onClick={()=>setOpen(!open)} aria-label="Menu">
        <span className="block w-5 h-0.5 bg-ink mb-1"/><span className="block w-5 h-0.5 bg-ink mb-1"/><span className="block w-5 h-0.5 bg-ink"/>
      </button>
      {open&&<div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={()=>setOpen(false)}/>}
      <nav className={`fixed top-0 left-0 h-full w-56 bg-cream border-r border-line z-40 flex flex-col py-6 px-4 transition-transform ${open?"translate-x-0":"-translate-x-full"} md:translate-x-0 md:static md:flex md:h-auto md:w-56`} aria-label="Main navigation">
        <p className="font-semibold text-lg px-2 mb-6">SkillForge</p>
        <ul className="space-y-1 flex-1">
          {NAV.map(n=><li key={n.href}><Link href={n.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-pale transition-colors">{n.label}</Link></li>)}
        </ul>
        <button className="text-sm text-muted px-3 py-2 text-left" onClick={()=>{localStorage.removeItem("sf_token");window.location.href="/";}}>Log out</button>
      </nav>
    </>
  );
}

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  const [careers, setCareers] = useState<any[]>([]);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const me = await api("/me");
      if (!me.onboarded) { window.location.href="/onboarding"; return; }
      setCareers(await api("/careers"));
      if (!me.career) return setD({ me });
      const [readiness, gaps, roadmap, missions] = await Promise.all([api("/readiness"),api("/gaps"),api("/roadmap"),api("/missions/today")]);
      setD({ me, readiness, gaps, roadmap, missions });
    } catch(e:any) { setErr(e.message); }
  }

  useEffect(()=>{ if(!localStorage.getItem("sf_token")){window.location.href="/login";return;} load(); },[]);

  if (err) return <div className="flex h-screen"><Sidebar/><p className="p-8" role="alert">{err}</p></div>;
  if (!d)  return <div className="flex h-screen"><Sidebar/><p className="p-8 text-muted">Loading your dashboard...</p></div>;

  if (!d.me.career) return (
    <div className="flex h-screen">
      <Sidebar/>
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-3xl font-semibold mb-2">What career are you targeting?</h1>
        <p className="text-muted mb-6">We'll build your personalised roadmap and skill gap analysis.</p>
        <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
          {careers.map(c=><button key={c.id} className="card text-left hover:border-sage transition-colors" onClick={async()=>{await api("/career/select",{careerId:c.id});load();}}>{c.name}</button>)}
        </div>
      </main>
    </div>
  );

  const hour = new Date().getHours();
  const greet = hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
  const doneMissions = d.missions.filter((m:any)=>m.done).length;
  const nextModule = d.roadmap.find((m:any)=>m.status==="pending");

  return (
    <div className="flex min-h-screen">
      <Sidebar/>
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold">{greet}, {d.me.name}.</h1>
          <p className="text-muted mt-1">Target: <strong>{d.me.career.name}</strong>{d.me.streak > 0 && <> · {d.me.streak}-day streak</>}</p>
        </header>

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <section className="card">
            <p className="text-sm text-muted">Career readiness</p>
            <p className="text-4xl font-semibold mt-1">{d.readiness.score}%</p>
            <p className="text-xs text-muted mt-2">{d.readiness.note}</p>
          </section>
          <section className="card">
            <p className="text-sm text-muted">Today's missions</p>
            <p className="text-4xl font-semibold mt-1">{doneMissions}/{d.missions.length}</p>
            <div className="h-1.5 bg-pale rounded mt-3"><div className="h-1.5 bg-terra rounded transition-all" style={{width:`${d.missions.length?doneMissions/d.missions.length*100:0}%`}}/></div>
          </section>
          <section className="card">
            <p className="text-sm text-muted">Next action</p>
            <p className="mt-1 font-medium text-sm">{nextModule?nextModule.title:"Roadmap complete 🎉"}</p>
            {nextModule&&<Link href={`/assess?skill=${nextModule.skillId}`} className="btn inline-block mt-3 text-sm">Take assessment →</Link>}
          </section>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top skill gaps */}
          <section className="card">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Top skill gaps</h2>
              <Link href="/skills" className="text-xs text-muted underline">See all</Link>
            </div>
            {d.gaps.slice(0,4).map((g:any)=>(
              <div key={g.skillId} className="mb-3 last:mb-0">
                <div className="flex justify-between text-sm mb-1"><span>{g.skill}</span><span className="text-muted">{g.current}→{g.required}</span></div>
                <div className="h-1.5 bg-pale rounded"><div className="h-1.5 bg-sage rounded transition-all" style={{width:`${Math.min(100,g.current/g.required*100)}%`}}/></div>
              </div>
            ))}
            {!d.gaps.length&&<p className="text-sm text-muted">No gaps — all skills are at target level!</p>}
          </section>

          {/* Daily missions */}
          <section className="card">
            <h2 className="font-semibold mb-3">Daily missions</h2>
            {d.missions.length===0&&<p className="text-sm text-muted">No missions yet — complete your skill gaps to generate missions.</p>}
            <ul className="space-y-2">
              {d.missions.map((m:any)=>(
                <li key={m.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5" checked={m.done} disabled={m.done}
                    onChange={async()=>{await api(`/missions/${m.id}/complete`,{});load();}}/>
                  <span className={m.done?"text-muted line-through":""}>{m.title}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Roadmap preview */}
          <section className="card">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Roadmap</h2>
              <Link href="/roadmap" className="text-xs text-muted underline">Full roadmap</Link>
            </div>
            <ol className="space-y-2">
              {d.roadmap.slice(0,5).map((m:any)=>(
                <li key={m.skillId} className="flex justify-between items-center text-sm">
                  <span className={m.status==="complete"?"text-muted":""}>
                    {m.status==="complete"?"✓ ":""}{m.title}
                  </span>
                  <span className="text-xs text-muted shrink-0 ml-2">{m.estimatedHours}h</span>
                </li>
              ))}
              {d.roadmap.length>5&&<li className="text-xs text-muted">+{d.roadmap.length-5} more modules</li>}
            </ol>
          </section>

          {/* Quick links */}
          <section className="card">
            <h2 className="font-semibold mb-3">Tools</h2>
            <div className="grid grid-cols-2 gap-2">
              {[{href:"/mentor",label:"AI Mentor",desc:"Ask anything"},{href:"/interview",label:"Interview Prep",desc:"Practice now"},
                {href:"/analyze",label:"Analyze",desc:"Job · Resume · GitHub"},{href:"/projects",label:"Projects",desc:"Build your portfolio"}
              ].map(t=>(
                <Link key={t.href} href={t.href} className="rounded-xl border border-line p-3 hover:border-sage transition-colors">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted mt-0.5">{t.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
