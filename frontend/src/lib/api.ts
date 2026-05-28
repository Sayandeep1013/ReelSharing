const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authFetch(
  path: string,
  token: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

export async function pingServer() {
  try {
    await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(10000) });
  } catch {
    // Cold start — ignore, just wake it up
  }
}

export async function fetchNotes(
  token: string,
  params: { search?: string; category?: string; tag?: string } = {}
) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.category) q.set("category", params.category);
  if (params.tag) q.set("tag", params.tag);
  return authFetch(`/notes/?${q}`, token);
}

export async function fetchNote(token: string, noteId: string) {
  return authFetch(`/notes/${noteId}`, token);
}

export async function deleteNote(token: string, noteId: string) {
  return authFetch(`/notes/${noteId}`, token, { method: "DELETE" });
}

export async function submitUrl(token: string, url: string) {
  const q = new URLSearchParams({ url });
  return authFetch(`/process/url?${q}`, token, { method: "POST" });
}

export async function submitUpload(token: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/process/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function addTag(token: string, noteId: string, tag: string) {
  const q = new URLSearchParams({ tag });
  return authFetch(`/notes/${noteId}/tags?${q}`, token, { method: "POST" });
}

export async function removeTag(token: string, noteId: string, tag: string) {
  return authFetch(`/notes/${noteId}/tags/${encodeURIComponent(tag)}`, token, {
    method: "DELETE",
  });
}

export async function updateCategory(
  token: string,
  noteId: string,
  category: string
) {
  const q = new URLSearchParams({ category });
  return authFetch(`/notes/${noteId}/category?${q}`, token, {
    method: "PATCH",
  });
}

export async function semanticSearch(token: string, query: string) {
  const q = new URLSearchParams({ q: query });
  return authFetch(`/notes/search/semantic?${q}`, token);
}
