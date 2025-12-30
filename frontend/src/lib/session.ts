const KEY = "spur_session_id";

export function getSessionId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setSessionId(id: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, id);
}

export function clearSessionId() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY);
}
