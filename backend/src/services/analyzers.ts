export const KEYWORDS: Record<string, string[]> = {
  "HTML/CSS": ["html", "css", "tailwind", "sass"], "JavaScript": ["javascript", "typescript", "es6"],
  "React": ["react", "next.js", "redux"], "Node.js": ["node", "node.js", "express", "nestjs"],
  "SQL": ["sql", "postgres", "postgresql", "mysql", "database"], "Git": ["git", "github", "gitlab", "version control"],
  "Python": ["python", "pandas", "numpy"], "REST APIs": ["restful", "rest api", "api", "graphql"],
  "Testing": ["jest", "testing", "unit test", "vitest", "cypress"], "Docker": ["docker", "kubernetes", "containers"],
  "AWS": ["aws", "azure", "gcp", "cloud"], "Authentication": ["jwt", "oauth", "authentication"],
  "DSA": ["data structures", "algorithms", "dsa"],
};
const esc = (s: string) => s.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
export const findSkills = (text: string) => { const t = text.toLowerCase();
  return Object.entries(KEYWORDS).filter(([, ks]) => ks.some(k => new RegExp(`(^|[^a-z0-9])${esc(k)}([^a-z0-9]|$)`).test(t))).map(([s]) => s); };

export function analyzeJob(text: string, levels: Record<string, number>) {
  const found = findSkills(text);
  const have = found.filter(s => (levels[s] ?? 0) >= 50), missing = found.filter(s => (levels[s] ?? 0) < 50);
  const exp = text.match(/(\d+)\+?\s*(?:years|yrs)/i);
  return { requiredSkills: found, youHave: have, gaps: missing, experience: exp ? `${exp[1]}+ years` : "Not stated",
    matchPercent: found.length ? Math.round(have.length / found.length * 100) : 0,
    recommendations: missing.map(s => `Add "${s}" to your roadmap and take its assessment (currently ${levels[s] ?? 0}%).`) };
}

export function analyzeResume(text: string, careerSkills: string[]) {
  const t = text.toLowerCase(), words = text.split(/\s+/).filter(Boolean).length;
  const sections = Object.fromEntries(["education", "experience", "projects", "skills"].map(s => [s, new RegExp(`^\\s*${s}`, "im").test(text)]));
  const found = findSkills(text), missing = careerSkills.filter(s => !found.includes(s));
  const metrics = (text.match(/\d+\s?(%|x|users|ms|k\b)/gi) ?? []).length;
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const checks = [hasEmail, words >= 150 && words <= 900, ...Object.values(sections), metrics >= 2];
  const ats = Math.round(checks.filter(Boolean).length / checks.length * 100);
  const align = careerSkills.length ? Math.round((careerSkills.length - missing.length) / careerSkills.length * 100) : 0;
  const tips: string[] = [];
  if (!hasEmail) tips.push("Add a professional email address.");
  if (words < 150) tips.push("Resume looks thin; add project and skill detail."); if (words > 900) tips.push("Trim to one or two pages.");
  for (const [s, ok] of Object.entries(sections)) if (!ok) tips.push(`Add a clear "${s}" section heading.`);
  if (metrics < 2) tips.push("Quantify impact (e.g. 'reduced load time by 30%').");
  missing.forEach(s => tips.push(`Missing keyword for your target role: ${s}. Learn it via your roadmap, then add a project.`));
  return { atsScore: ats, roleAlignment: align, words, sections, skillsFound: found, missingKeywords: missing, recommendations: tips };
}

export async function analyzeGithub(username: string) {
  const r = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`, { headers: { "user-agent": "SkillForge", accept: "application/vnd.github+json" } });
  if (r.status === 404) throw Object.assign(new Error("GitHub user not found."), { status: 404 });
  if (!r.ok) throw Object.assign(new Error("GitHub is unavailable or rate limited. Please try again later."), { status: 502 });
  const repos: any[] = (await r.json()).filter((x: any) => !x.fork);
  const langs: Record<string, number> = {}; repos.forEach(x => x.language && (langs[x.language] = (langs[x.language] ?? 0) + 1));
  const withDesc = repos.filter(x => x.description).length, recent = repos.filter(x => Date.now() - Date.parse(x.pushed_at) < 90 * 864e5).length;
  const tips: string[] = [];
  if (!repos.length) tips.push("No public original repositories yet. Publish your best project.");
  if (repos.length && withDesc / repos.length < 0.7) tips.push("Add descriptions to your repositories so recruiters understand each project.");
  if (repos.length && !recent) tips.push("No pushes in 90 days. Regular activity signals consistency.");
  if (Object.keys(langs).length < 3) tips.push("Diversify: add a project using another language or stack.");
  if (repos.length < 4) tips.push("Aim for 4+ polished projects with README files (setup, screenshots, tech stack).");
  return { repos: repos.length, languages: langs, describedRepos: withDesc, activeLast90Days: recent, topRepos: repos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5).map(x => ({ name: x.name, stars: x.stargazers_count, language: x.language, url: x.html_url })), recommendations: tips,
    note: "Based on public data only. README quality is not inspected in this version." };
}
