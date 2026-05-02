export interface CodeSession {
  code: string;
  joinedAt: number;
  lastUsed: number;
}

const HISTORY_KEY = "croxync-code-history";
const CURRENT_KEY = "croxync-code";

export function getCodeHistory(): CodeSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CodeSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addCodeToHistory(code: string) {
  if (typeof window === "undefined") return;
  const history = getCodeHistory();
  const existing = history.find((s) => s.code === code);
  const now = Date.now();
  if (existing) {
    existing.lastUsed = now;
  } else {
    history.unshift({ code, joinedAt: now, lastUsed: now });
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

export function removeCodeFromHistory(code: string) {
  if (typeof window === "undefined") return;
  const history = getCodeHistory().filter((s) => s.code !== code);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getCurrentCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CURRENT_KEY);
}

export function setCurrentCode(code: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_KEY, code);
  addCodeToHistory(code);
}

export function clearCurrentCode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_KEY);
}
