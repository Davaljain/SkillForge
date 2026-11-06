import Link from "next/link";
const steps = ["Choose your career", "Measure your skills", "Build your roadmap", "Practice and improve", "Become job-ready"];
export default function Home() {
  return (<main className="mx-auto max-w-5xl px-6">
    <nav className="flex items-center justify-between py-6"><span className="font-semibold text-lg">SkillForge</span>
      <div className="flex gap-4 items-center"><Link href="/login" className="text-muted">Log in</Link><Link href="/signup" className="btn">Get started</Link></div></nav>
    <section className="py-20 md:py-28">
      <h1 className="text-4xl md:text-6xl font-semibold leading-tight tracking-tight">Discover your skills.<br />Build your roadmap.<br />Become job-ready.</h1>
      <p className="mt-6 max-w-xl text-lg text-muted">SkillForge uses AI to understand where you are, identify what you need to learn, and build a personalized path toward the career you want.</p>
      <div className="mt-8 flex gap-3 flex-wrap"><Link href="/signup" className="btn">Start Your Journey</Link><a href="#how" className="rounded-xl border border-line px-4 py-2">See How It Works</a></div>
    </section>
    <section id="how" className="pb-24"><h2 className="text-2xl font-semibold mb-6">How SkillForge works</h2>
      <ol className="grid gap-4 md:grid-cols-5">{steps.map((s, i) => <li key={s} className="card"><span className="text-terra text-sm">0{i + 1}</span><p className="mt-2 font-medium">{s}</p></li>)}</ol></section>
    <section className="pb-24 text-center"><h2 className="text-3xl font-semibold">Your career has a destination. Let SkillForge build the path.</h2>
      <Link href="/signup" className="btn inline-block mt-6">Start Building My Career</Link></section>
  </main>);
}
