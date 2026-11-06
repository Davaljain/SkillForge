import { describe, it, expect } from "vitest";
import { computeGaps, scoreAttempt, blend, readiness, priorityOf } from "../services/skillGap";
import { analyzeJob, analyzeResume, findSkills } from "../services/analyzers";

describe("skill gap engine", () => {
  it("computes gaps and priority", () => {
    const g = computeGaps([{skillId:"n",skill:"Node.js",required:75,order:0}],{n:35});
    expect(g[0]).toMatchObject({gap:40,priority:"High"});
  });
  it("priority thresholds", () => {
    expect(priorityOf(0)).toBe("Met");
    expect(priorityOf(14)).toBe("Low");
    expect(priorityOf(20)).toBe("Medium");
    expect(priorityOf(30)).toBe("High");
  });
  it("skill at 100 with requirement 50 counts as met", () => {
    const g = computeGaps([{skillId:"a",skill:"A",required:50,order:0}],{a:100});
    expect(g[0].gap).toBe(0);
    expect(g[0].priority).toBe("Met");
  });
  it("scores attempts correctly", () => {
    const result = scoreAttempt(
      [{id:"a",answer:1},{id:"b",answer:0}],
      [{questionId:"a",choice:1},{questionId:"b",choice:2}]
    );
    expect(result).toMatchObject({correct:1,total:2,pct:50});
  });
  it("all correct gives 100%", () => {
    const r = scoreAttempt([{id:"x",answer:2}],[{questionId:"x",choice:2}]);
    expect(r.pct).toBe(100);
  });
  it("blend: first attempt sets level directly", () => expect(blend(undefined,80)).toBe(80));
  it("blend: weighted average for retake", () => expect(blend(50,100)).toBe(80));
  it("readiness is 100 when all skills meet requirements", () => {
    expect(readiness(computeGaps([{skillId:"a",skill:"A",required:50,order:0}],{a:100}))).toBe(100);
  });
  it("readiness is 0 when no skills known", () => {
    expect(readiness(computeGaps([{skillId:"a",skill:"A",required:80,order:0}],{}))).toBe(0);
  });
});

describe("analyzers", () => {
  it("finds skills without false positives", () => {
    expect(findSkills("We use React and Node.js with Docker")).toEqual(expect.arrayContaining(["React","Node.js","Docker"]));
    expect(findSkills("the rest of the team")).not.toContain("REST APIs");
  });
  it("job match percent", () => {
    const r = analyzeJob("Need React and Docker developers, 3+ years experience. Building APIs.".padEnd(60,"."),{React:80,Docker:0});
    expect(r.gaps).toContain("Docker");
    expect(r.youHave).toContain("React");
  });
  it("resume flags missing keywords", () => {
    const r = analyzeResume("Skills\nReact developer contact@example.com", ["React","Docker"]);
    expect(r.missingKeywords).toContain("Docker");
    expect(r.skillsFound).toContain("React");
  });
  it("resume ATS score improves with email", () => {
    const withEmail = analyzeResume("Skills\nReact dev a@b.co", ["React"]);
    const noEmail   = analyzeResume("Skills\nReact developer", ["React"]);
    expect(withEmail.atsScore).toBeGreaterThanOrEqual(noEmail.atsScore);
  });
});
