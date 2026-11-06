import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import mongoose from "mongoose";
import { User, Career, Skill, Question, Mission, AIConversation, InterviewSession, Attempt } from "./models/index";
import { LESSONS } from "./services/content";
import { computeGaps, scoreAttempt, blend, buildRoadmap, readiness } from "./services/skillGap";
import { mentorReply } from "./services/ai";
import { mountAnalyzers } from "./routes.analyzers";

const MONGO_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/skillforge";
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(e => { console.error("MongoDB connection failed:", e.message); process.exit(1); });

const app = express();
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET env variable is required");

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use("/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true }));

type Req = Request & { uid: string };
const wrap = (fn: (req: Req, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as Req, res).catch(next);

const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const bearer = (req.headers.authorization ?? "").replace("Bearer ", "");
    (req as Req).uid = (jwt.verify(bearer, SECRET) as { uid: string }).uid;
    next();
  } catch {
    res.status(401).json({ error: "Your session has expired. Please log in again." });
  }
};
const token = (uid: string) => jwt.sign({ uid }, SECRET, { expiresIn: "7d" });

async function gapsFor(uid: string) {
  const u = await User.findById(uid);
  if (!u?.careerId) return [];
  const career = await Career.findById(u.careerId);
  if (!career) return [];
  const levelMap: Record<string, number> = {};
  for (const s of u.skills) levelMap[s.skillId.toString()] = s.level;
  return computeGaps(
    career.skills.map((cs: {skillId:any;skillName:string;required:number;order:number}) => ({ skillId: cs.skillId.toString(), skill: cs.skillName, required: cs.required, order: cs.order })),
    levelMap
  );
}

async function streakFor(uid: string) {
  const ms = await Mission.find({ userId: uid }).sort({ date: -1 }).limit(400);
  const byDate = new Map<string, boolean>();
  for (const m of ms) byDate.set(m.date, (byDate.get(m.date) ?? true) && m.done);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const cur = new Date();
  if (!byDate.get(day(cur))) cur.setDate(cur.getDate() - 1);
  let streak = 0;
  while (byDate.get(day(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  return streak;
}

const credsSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

app.post("/auth/signup", wrap(async (req, res) => {
  const b = credsSchema.extend({ name: z.string().min(1).max(80) }).parse(req.body);
  if (await User.findOne({ email: b.email.toLowerCase() }))
    return res.status(409).json({ error: "An account with this email already exists." });
  const u = await User.create({ name: b.name, email: b.email.toLowerCase(), passwordHash: await bcrypt.hash(b.password, 12) });
  res.json({ token: token(u._id.toString()) });
}));

app.post("/auth/login", wrap(async (req, res) => {
  const b = credsSchema.parse(req.body);
  const u = await User.findOne({ email: b.email.toLowerCase() });
  if (!u || !(await bcrypt.compare(b.password, u.passwordHash)))
    return res.status(401).json({ error: "Invalid email or password." });
  res.json({ token: token(u._id.toString()) });
}));

app.get("/me", auth, wrap(async (req, res) => {
  const u = await User.findById(req.uid).populate("careerId");
  if (!u) return res.status(404).json({ error: "User not found." });
  res.json({ id: u._id, name: u.name, email: u.email,
    career: u.careerId ? { id: (u.careerId as any)._id, name: (u.careerId as any).name } : null,
    onboarded: u.onboarded, college: u.college, degree: u.degree, gradYear: u.gradYear, semester: u.semester, streak: await streakFor(req.uid) });
}));

app.put("/profile", auth, wrap(async (req, res) => {
  const b = z.object({ college: z.string().max(120).optional(), degree: z.string().max(120).optional(),
    gradYear: z.number().int().min(1990).max(2100).optional(), semester: z.number().int().min(1).max(12).optional() }).parse(req.body);
  await User.findByIdAndUpdate(req.uid, { $set: b });
  res.json({ ok: true });
}));

app.get("/careers", wrap(async (_req, res) => {
  const cs = await Career.find({}, { name: 1 });
  res.json(cs.map(c => ({ id: c._id, name: c.name })));
}));

app.post("/career/select", auth, wrap(async (req, res) => {
  const { careerId } = z.object({ careerId: z.string().min(1) }).parse(req.body);
  await User.findByIdAndUpdate(req.uid, { $set: { careerId, completedModules: [] } });
  res.json({ ok: true });
}));

app.get("/skills", wrap(async (_req, res) => {
  const skills = await Skill.find({}, { name: 1 }).sort({ name: 1 });
  res.json(skills.map(s => ({ id: s._id, name: s.name })));
}));

app.post("/skills/self-report", auth, wrap(async (req, res) => {
  const b = z.object({ levels: z.array(z.object({ skillId: z.string(), level: z.number().int().min(0).max(100) })).max(50) }).parse(req.body);
  const u = await User.findById(req.uid);
  if (!u) return res.status(404).json({ error: "User not found." });
  for (const { skillId, level } of b.levels) {
    const idx = u.skills.findIndex((s: any) => s.skillId.toString() === skillId);
    if (idx >= 0) u.skills[idx].level = level;
    else u.skills.push({ skillId: new mongoose.Types.ObjectId(skillId), level });
  }
  u.onboarded = true;
  await u.save();
  res.json({ ok: true });
}));

app.get("/skill-profile", auth, wrap(async (req, res) => {
  const u = await User.findById(req.uid).populate("skills.skillId");
  if (!u) return res.status(404).json({ error: "User not found." });
  res.json(u.skills.map((s: any) => ({ skillId: s.skillId.toString(), skill: s.skillId?.name ?? "Unknown", level: s.level })));
}));

app.get("/gaps", auth, wrap(async (req, res) => res.json(await gapsFor(req.uid))));
app.get("/readiness", auth, wrap(async (req, res) => {
  const [g, u, sessions] = await Promise.all([gapsFor(req.uid), User.findById(req.uid), InterviewSession.find({ userId: req.uid, status: "complete" })]);
  const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length * 10) : null;
  const parts: Record<string, number | null> = {
    skills: g.length ? readiness(g) : null,
    projects: u?.completedProjects?.length ? Math.min(100, Math.round(u.completedProjects.length / 3 * 100)) : null,
    dsa: avg(sessions.filter((s: any) => s.type === "dsa").map((s: any) => s.overallScore ?? 0)),
    resume: u?.resumeScore ?? null, github: u?.githubScore ?? null,
    interview: avg(sessions.filter((s: any) => s.type !== "dsa").map((s: any) => s.overallScore ?? 0)),
  };
  const W: Record<string, number> = { skills: 40, projects: 15, dsa: 10, resume: 15, github: 10, interview: 10 };
  let num = 0, den = 0;
  for (const [k, v] of Object.entries(parts)) if (v !== null) { num += v * W[k]; den += W[k]; }
  res.json({ score: den ? Math.round(num / den) : 0, breakdown: parts, note: "A preparation indicator, not a guarantee of employment. Only measured areas count toward the score." });
}));

app.get("/roadmap", auth, wrap(async (req, res) => {
  const u = await User.findById(req.uid);
  const done: Set<string> = new Set((u?.completedModules ?? []).map((id: any) => String(id)));
  const gaps = await gapsFor(req.uid); const name = new Map(gaps.map(g => [g.skillId, g.skill]));
  res.json(buildRoadmap(gaps, done).map(m => ({ ...m, skill: name.get(m.skillId), lesson: LESSONS[name.get(m.skillId) ?? ""] ?? null })));
}));

app.post("/roadmap/module/:skillId/complete", auth, wrap(async (req, res) => {
  await User.findByIdAndUpdate(req.uid, { $addToSet: { completedModules: new mongoose.Types.ObjectId(req.params.skillId) } });
  res.json({ ok: true });
}));

app.post("/assessments/start", auth, wrap(async (req, res) => {
  const { skillId } = z.object({ skillId: z.string().optional() }).parse(req.body);
  const g = await gapsFor(req.uid);
  const targetId = skillId ?? g.find(x => x.gap > 0)?.skillId ?? g[0]?.skillId;
  if (!targetId) return res.status(400).json({ error: "Select a career first to start an assessment." });
  const qs = await Question.find({ skillId: targetId }).limit(10);
  if (!qs.length) return res.status(404).json({ error: "No questions available for this skill yet." });
  const skill = await Skill.findById(targetId);
  res.json({ skillId: targetId, skillName: skill?.name ?? "Unknown",
    questions: qs.map(({ _id, prompt, options, type, difficulty }) => ({ id: _id, prompt, options, type, difficulty })) });
}));

app.post("/assessments/submit", auth, wrap(async (req, res) => {
  const b = z.object({ skillId: z.string(), answers: z.array(z.object({ questionId: z.string(), choice: z.number().int().min(-1).max(10) })) }).parse(req.body);
  const qs = await Question.find({ _id: { $in: b.answers.map(a => a.questionId) } });
  const result = scoreAttempt(qs.map(q => ({ id: q._id.toString(), answer: q.answer })), b.answers);
  const u = await User.findById(req.uid);
  if (!u) return res.status(404).json({ error: "User not found." });
  const idx = u.skills.findIndex((s: any) => s.skillId.toString() === b.skillId);
  const prevLevel = idx >= 0 ? u.skills[idx].level : undefined;
  const level = blend(prevLevel, result.pct);
  if (idx >= 0) u.skills[idx].level = level;
  else u.skills.push({ skillId: new mongoose.Types.ObjectId(b.skillId), level });
  await u.save();
  await Attempt.create({ userId: req.uid, skillName: (await Skill.findById(b.skillId))?.name ?? "Skill", pct: result.pct, level });
  res.json({ ...result, level, review: qs.map(q => ({ id: q._id, prompt: q.prompt, options: q.options, answer: q.answer, explanation: q.explanation })),
    nextStep: result.pct < 50 ? "Reinforce fundamentals, then retake this assessment." : "Great work! Your roadmap moves forward." });
}));

app.get("/assessments/history", auth, wrap(async (req, res) => {
  const a = await Attempt.find({ userId: req.uid }).sort({ createdAt: 1 }).limit(60);
  res.json(a.map((x: any) => ({ skill: x.skillName, pct: x.pct, level: x.level, at: x.createdAt })));
}));

app.get("/missions/today", auth, wrap(async (req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  let ms = await Mission.find({ userId: req.uid, date });
  if (!ms.length) {
    const top = (await gapsFor(req.uid)).filter(g => g.gap > 0).slice(0, 2);
    if (top.length) {
      const docs = top.flatMap(g => [
        { userId: req.uid, skillId: g.skillId, skillName: g.skill, title: `Study ${g.skill} core concepts`, date },
        { userId: req.uid, skillId: g.skillId, skillName: g.skill, title: `Take a ${g.skill} practice assessment`, date },
      ]);
      await Mission.insertMany(docs);
      ms = await Mission.find({ userId: req.uid, date });
    }
  }
  res.json(ms.map(m => ({ id: m._id, title: m.title, skillId: m.skillId, done: m.done })));
}));

app.post("/missions/:id/complete", auth, wrap(async (req, res) => {
  const r = await Mission.findOneAndUpdate({ _id: req.params.id, userId: req.uid }, { done: true });
  res.status(r ? 200 : 404).json({ ok: !!r });
}));

app.get("/mentor/history", auth, wrap(async (req, res) => {
  const conv = await AIConversation.findOne({ userId: req.uid });
  res.json(conv ? conv.messages.slice(-20) : []);
}));

app.post("/mentor/chat", auth, wrap(async (req, res) => {
  const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body);
  const u = await User.findById(req.uid).populate("careerId");
  if (!u) return res.status(404).json({ error: "User not found." });
  const gaps = await gapsFor(req.uid);
  const result = await mentorReply(message, { name: u.name, career: (u.careerId as any)?.name, gaps });
  await AIConversation.findOneAndUpdate({ userId: req.uid },
    { $push: { messages: [{ role: "user", content: message, at: new Date() }, { role: "assistant", content: result.reply, at: new Date() }] } },
    { upsert: true });
  res.json(result);
}));

app.post("/interview/start", auth, wrap(async (req, res) => {
  const { type } = z.object({ type: z.enum(["technical","behavioral","hr","dsa"]) }).parse(req.body);
  const u = await User.findById(req.uid).populate("careerId");
  if (!u) return res.status(404).json({ error: "User not found." });
  const career = (u.careerId as any)?.name ?? "Software Developer";
  const gaps = await gapsFor(req.uid);
  const topSkill = gaps[0]?.skill ?? "JavaScript";
  const firstQ = await getInterviewQuestion(type, career, topSkill, []);
  const session = await InterviewSession.create({ userId: req.uid, type, career, turns: [], status: "active" });
  res.json({ sessionId: session._id, question: firstQ, type, career });
}));

app.post("/interview/answer", auth, wrap(async (req, res) => {
  const { sessionId, answer, question } = z.object({ sessionId: z.string(), answer: z.string().min(1).max(5000), question: z.string() }).parse(req.body);
  const session = await InterviewSession.findOne({ _id: sessionId, userId: req.uid, status: "active" });
  if (!session) return res.status(404).json({ error: "Interview session not found." });
  const { feedback, score, nextQuestion } = await evaluateAnswer(session.type, session.career, question, answer);
  session.turns.push({ question, answer, feedback, score, at: new Date() });
  let done = false;
  if (session.turns.length >= 5) {
    session.status = "complete";
    session.overallScore = Math.round(session.turns.reduce((acc: number, t: any) => acc + t.score, 0) / session.turns.length);
    done = true;
  }
  await session.save();
  res.json({ feedback, score, done, nextQuestion: done ? null : nextQuestion,
    overallScore: done ? session.overallScore : null, turnsLeft: Math.max(0, 5 - session.turns.length) });
}));

app.get("/interview/sessions", auth, wrap(async (req, res) => {
  const sessions = await InterviewSession.find({ userId: req.uid }).sort({ createdAt: -1 }).limit(10);
  res.json(sessions.map(s => ({ id: s._id, type: s.type, career: s.career, status: s.status,
    overallScore: s.overallScore, turnCount: s.turns.length, createdAt: (s as any).createdAt })));
}));

app.get("/projects", auth, wrap(async (req, res) => {
  const gaps = await gapsFor(req.uid);
  const topGaps: string[] = gaps.filter(g => g.gap > 0).slice(0, 3).map(g => g.skill);
  const PROJECTS = [
    { skills:["Node.js","REST APIs","SQL"], name:"Job Portal API", desc:"Build a REST API for job listings with user auth, CRUD and a PostgreSQL database.", techs:["Node.js","Express","MongoDB","JWT"], hours:20 },
    { skills:["React","REST APIs"], name:"React Dashboard", desc:"A data-fetching dashboard with charts, filters and pagination from a public API.", techs:["React","Tailwind","REST APIs"], hours:15 },
    { skills:["HTML/CSS","JavaScript"], name:"Portfolio Website", desc:"A responsive personal portfolio with project showcase and working contact form.", techs:["HTML","CSS","JavaScript"], hours:10 },
    { skills:["SQL","Python"], name:"Data Analytics Report", desc:"Query a dataset, clean with Python, and visualise insights with charts.", techs:["Python","Pandas","SQL","Matplotlib"], hours:12 },
    { skills:["Node.js","SQL","REST APIs"], name:"Expense Tracker", desc:"Full-stack expense tracker with categories, charts and monthly summaries.", techs:["Node.js","React","MongoDB"], hours:18 },
    { skills:["Git","Node.js"], name:"CLI Todo App", desc:"A command-line task manager persisting to JSON, with tags and priorities.", techs:["Node.js","Commander.js","Git"], hours:8 },
    { skills:["React","Node.js","SQL"], name:"Blog Platform", desc:"Full-stack blog with markdown support, auth, comments and admin panel.", techs:["React","Node.js","MongoDB","MDX"], hours:25 },
    { skills:["Docker","Node.js"], name:"Containerised Microservice", desc:"Containerise a Node.js service with docker-compose and a database.", techs:["Docker","Node.js","MongoDB"], hours:12 },
    { skills:["Python"], name:"Web Scraper & Report", desc:"Scrape a public dataset, store results and generate an automated HTML report.", techs:["Python","BeautifulSoup","Pandas"], hours:10 },
    { skills:["REST APIs","Node.js","React"], name:"Real-time Chat App", desc:"Chat app with rooms, typing indicators, and message history via WebSockets.", techs:["Node.js","Socket.io","React"], hours:20 },
  ];
  const scored = PROJECTS.map(p => ({ ...p, relevance: p.skills.filter(s => topGaps.includes(s)).length }))
    .filter(p => p.relevance > 0).sort((a, b) => b.relevance - a.relevance).slice(0, 4);
  const u = await User.findById(req.uid); const doneSet = new Set<string>(u?.completedProjects ?? []);
  res.json((scored.length ? scored : PROJECTS.slice(0, 3)).map(p => ({ ...p, done: doneSet.has(p.name) })));
}));

app.post("/projects/complete", auth, wrap(async (req, res) => {
  const { name, done } = z.object({ name: z.string().max(80), done: z.boolean() }).parse(req.body);
  await User.findByIdAndUpdate(req.uid, done ? { $addToSet: { completedProjects: name } } : { $pull: { completedProjects: name } });
  res.json({ ok: true });
}));
app.get("/focus", auth, wrap(async (req, res) => res.json((await User.findById(req.uid))?.extraFocus ?? [])));

async function getInterviewQuestion(type: string, career: string, topSkill: string, history: string[]): Promise<string> {
  if (process.env.AI_API_KEY) {
    try {
      const prompts: Record<string,string> = {
        technical:`You are conducting a ${career} technical interview. Ask one concise technical question about ${topSkill} or related skills. No preamble. Just the question.`,
        behavioral:`You are conducting a behavioral interview for a ${career} role. Ask one STAR-format behavioral question. No preamble.`,
        hr:`You are conducting an HR interview for a ${career} role. Ask one HR question about motivation, teamwork, or career goals. No preamble.`,
        dsa:`You are conducting a DSA interview. Ask one data structures or algorithms question suitable for a ${career} role. No preamble.`,
      };
      const r = await fetch("https://api.anthropic.com/v1/messages", { method:"POST",
        headers:{"content-type":"application/json","x-api-key":process.env.AI_API_KEY,"anthropic-version":"2023-06-01"},
        body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:200, system:prompts[type]??prompts.technical,
          messages:[{role:"user",content:`Previous: ${history.slice(-3).join("; ")||"none"}. Next question:`}] }) });
      if (r.ok) { const d:any=await r.json(); return d.content?.[0]?.text??fallbackQ(type); }
    } catch {}
  }
  return fallbackQ(type);
}

async function evaluateAnswer(type: string, career: string, question: string, answer: string): Promise<{feedback:string;score:number;nextQuestion:string}> {
  if (process.env.AI_API_KEY) {
    try {
      const system=`You are evaluating a ${career} ${type} interview. Give brief feedback (2-3 sentences), a score 1-10, and the next question. Respond ONLY as JSON: {"feedback":"...","score":7,"nextQuestion":"..."}`;
      const r = await fetch("https://api.anthropic.com/v1/messages", { method:"POST",
        headers:{"content-type":"application/json","x-api-key":process.env.AI_API_KEY,"anthropic-version":"2023-06-01"},
        body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:400, system,
          messages:[{role:"user",content:`Q: ${question}\nA: ${answer}`}] }) });
      if (r.ok) { const d:any=await r.json(); const p=JSON.parse((d.content?.[0]?.text??"{}").replace(/```json|```/g,"").trim());
        return {feedback:p.feedback??"Good effort.",score:Math.min(10,Math.max(1,p.score??5)),nextQuestion:p.nextQuestion??fallbackQ(type)}; }
    } catch {}
  }
  return {feedback:"Answer received. Practise clarity and structure (STAR method helps).",score:5,nextQuestion:fallbackQ(type)};
}

function fallbackQ(type:string):string {
  const q:Record<string,string[]>={
    technical:["Explain how a REST API works.","Difference between SQL and NoSQL?","How does async/await work in JS?","What are closures?","Explain Big O notation."],
    behavioral:["Tell me about solving a difficult problem.","Describe meeting a tight deadline.","How did you handle a team conflict?","Describe a project you're proud of.","How do you prioritise tasks?"],
    hr:["Why this field?","Where do you see yourself in 5 years?","What are your strengths?","Why are you interested in this role?","What motivates you to learn?"],
    dsa:["How would you reverse a linked list?","Explain binary search.","What is a hash map?","Difference between BFS and DFS?","Find duplicates in an array."],
  };
  const list=q[type]??q.technical;
  return list[Math.floor(Math.random()*list.length)];
}

mountAnalyzers(app, { auth, wrap, db: null, gapsFor } as any);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError)
    return res.status(400).json({ error:"Please check your input and try again.", details:err.issues.map(i=>i.message) });
  if (err instanceof mongoose.Error.CastError) return res.status(400).json({ error: "Invalid ID format." });
  console.error(err);
  res.status(500).json({ error:"Something went wrong. Please try again." });
});
app.listen(process.env.PORT ?? 4000, () => console.log("SkillForge API running on port 4000"));
