import { Express, RequestHandler } from "express";
import multer from "multer";
import { z } from "zod";
import { analyzeJob, analyzeResume, analyzeGithub } from "./services/analyzers";
import { User } from "./models/index";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } }).single("file");
const TYPES = ["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export function mountAnalyzers(
  app: Express,
  d: { auth: RequestHandler; wrap: any; db: null; gapsFor: (uid: string) => Promise<any[]> }
) {
  const { auth, wrap, gapsFor } = d;

  app.post("/jobs/analyze", auth, wrap(async (req: any, res: any) => {
    const { text } = z.object({ text: z.string().trim().min(50,"Please paste the full job description.").max(20000) }).parse(req.body);
    const u = await User.findById(req.uid).populate("skills.skillId");
    const levels: Record<string,number> = {};
    for (const s of (u?.skills ?? [])) levels[(s.skillId as any).name] = s.level;
    const out = analyzeJob(text, levels);
    await User.findByIdAndUpdate(req.uid, { $addToSet: { extraFocus: { $each: out.gaps } } });
    res.json(out);
  }));

  app.post("/github/analyze", auth, wrap(async (req: any, res: any) => {
    const { username } = z.object({ username: z.string().regex(/^[a-zA-Z0-9-]{1,39}$/,"Enter a valid GitHub username.") }).parse(req.body);
    try {
      const o = await analyzeGithub(username);
      const score = Math.min(40, o.repos * 8) + Math.min(20, o.activeLast90Days * 5) + Math.min(15, Object.keys(o.languages).length * 5) + Math.round(o.describedRepos / Math.max(o.repos, 1) * 25);
      await User.findByIdAndUpdate(req.uid, { $set: { githubScore: score } });
      res.json({ ...o, score });
    }
    catch (e: any) { res.status(e.status ?? 502).json({ error: e.message ?? "Could not reach GitHub." }); }
  }));

  app.post("/resume/analyze", auth, (req: any, res: any, next: any) => upload(req, res, (err: any) => {
    if (err) return res.status(400).json({ error: "Upload failed. Use a PDF or DOCX under 3 MB." });
    if (!req.file || !TYPES.includes(req.file.mimetype))
      return res.status(400).json({ error: "Please upload a PDF or DOCX resume." });
    (async () => {
      let text = "";
      try {
        if (req.file.mimetype === TYPES[0]) text = (await require("pdf-parse")(req.file.buffer)).text;
        else text = (await require("mammoth").extractRawText({ buffer: req.file.buffer })).value;
      } catch { return res.status(422).json({ error: "We couldn't read that file. Try exporting it again." }); }
      if (text.trim().length < 50) return res.status(422).json({ error: "No readable text found (scanned PDFs aren't supported yet)." });
      const gaps = await gapsFor(req.uid);
      const out = analyzeResume(text, gaps.map((g: any) => g.skill));
      await User.findByIdAndUpdate(req.uid, { $set: { resumeScore: Math.round((out.atsScore + out.roleAlignment) / 2) } });
      res.json(out);
    })().catch(next);
  }));
}
