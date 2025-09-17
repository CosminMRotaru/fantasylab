const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function request(path, options = {}) {
  const url = path.startsWith("http") ? path : API_BASE + path;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), options.timeout || 12000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const ct = res.headers.get("content-type") || "";
    let body = null;
    if (ct.includes("application/json")) {
      body = await res.json().catch(() => null);
    } else {
      body = await res.text().catch(() => null);
    }
    if (!res.ok) {
      return { ok: false, status: res.status, body };
    }
    return { ok: true, status: res.status, body };
  } catch (e) {
    return { ok: false, error: e.message || "network_error" };
  } finally {
    clearTimeout(id);
  }
}

export async function getJson(path, opts) {
  const r = await request(path, opts);
  if (r.ok) return r.body;
  return null;
}

export { request, API_BASE };
