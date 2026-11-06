const BASE = process.env.NEXT_PUBLIC_API ?? "http://localhost:4000";
export async function api<T = any>(path: string, body?: unknown, method?: string): Promise<T> {
  const t = typeof window !== "undefined" ? localStorage.getItem("sf_token") : null;
  let r: Response;
  try { r = await fetch(BASE + path, { method: method ?? (body ? "POST" : "GET"), headers: { "content-type": "application/json", ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error("Network problem. Please check your connection and try again."); }
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && t) { localStorage.removeItem("sf_token"); window.location.href = "/login"; }
  if (!r.ok) throw new Error(d.error ?? "Something went wrong. Please try again.");
  return d;
}
export async function upload<T = any>(path: string, file: File): Promise<T> {
  const fd = new FormData(); fd.append("file", file);
  let r: Response;
  try { r = await fetch(BASE + path, { method: "POST", headers: { authorization: `Bearer ${localStorage.getItem("sf_token")}` }, body: fd }); }
  catch { throw new Error("Network problem. Please check your connection and try again."); }
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error ?? "Something went wrong. Please try again."); return d;
}
