export type Gap = { skillId: string; skill: string; current: number; required: number; gap: number; priority: "High"|"Medium"|"Low"|"Met"; order: number };
export const priorityOf = (gap: number) => gap <= 0 ? "Met" : gap >= 30 ? "High" : gap >= 15 ? "Medium" : "Low";
export function computeGaps(req: {skillId:string;skill:string;required:number;order:number}[], levels: Record<string, number>): Gap[] {
  return req.map(r => { const current = levels[r.skillId] ?? 0; const gap = r.required - current;
    return { skillId:r.skillId, skill:r.skill, current, required:r.required, gap:Math.max(gap,0), priority:priorityOf(gap) as Gap["priority"], order:r.order }; })
    .sort((a,b) => b.gap - a.gap || a.order - b.order);
}
export const scoreAttempt = (qs:{id:string;answer:number}[], answers:{questionId:string;choice:number}[]) => {
  const m = new Map(answers.map(a => [a.questionId, a.choice]));
  const correct = qs.filter(q => m.get(q.id) === q.answer).length;
  return { correct, total: qs.length, pct: qs.length ? Math.round(correct/qs.length*100) : 0 };
};
export const blend = (prev: number|undefined, score: number) => prev === undefined ? score : Math.round(prev*0.4 + score*0.6);
// Adaptive roadmap: order by gap; modules with gap<=0 are complete; weak recent scores add a practice step.
export function buildRoadmap(gaps: Gap[], completed: Set<string>) {
  return [...gaps].sort((a,b) => a.order - b.order).map(g => ({
    skillId:g.skillId, title: g.gap > 0 && g.current > 0 && g.current < 50 ? `${g.skill}: reinforce fundamentals` : `${g.skill} ${g.current === 0 ? "from scratch" : "advancement"}`,
    status: g.gap <= 0 || completed.has(g.skillId) ? "complete" : "pending", gap: g.gap, priority: g.priority,
    steps: ["Learn core concepts","Practice tasks","Build a mini project","Take the assessment"], estimatedHours: Math.max(2, Math.round(g.gap/4)) }));
}
export const readiness = (gaps: Gap[]) => gaps.length ? Math.round(gaps.reduce((s,g) => s + Math.min(g.current/g.required,1), 0)/gaps.length*100) : 0;
