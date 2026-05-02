"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCopy, Trash2, ExternalLink, Copy, LogOut, RefreshCw, Clock, QrCode, X, Link2, Code, FileText, List, MoreHorizontal, Check, Plus, Send, CheckCircle, Download, History, ChevronDown, ArrowRight } from "lucide-react";
import { detectCategory } from "@/lib/categories";
import { getCurrentCode, setCurrentCode, clearCurrentCode, getCodeHistory, removeCodeFromHistory, type CodeSession } from "@/lib/session";

interface Clip {
  id: string;
  content: string;
  type: string;
  category: string;
  title: string | null;
  source: string | null;
  createdAt: string;
}

const CATEGORIES = [
  { key: "all", label: "All", icon: MoreHorizontal },
  { key: "links", label: "Links", icon: Link2 },
  { key: "code", label: "Code", icon: Code },
  { key: "notes", label: "Notes", icon: FileText },
  { key: "lists", label: "Lists", icon: List },
  { key: "general", label: "Other", icon: MoreHorizontal },
];

function detectLanguage(content: string): string | undefined {
  const trimmed = content.trim();
  if (/^<\?xml\b/i.test(trimmed) || /^<html\b/i.test(trimmed) || /<\/\w+>/.test(trimmed) && /<\w+[^>]*>/.test(trimmed)) return "markup";
  if (/\bfunction\b.*=>|\bconst\b.*=\s*\(.*\)\s*=>/m.test(trimmed) || /\btypescript\b|\binterface\b.*\{|\btype\b.*=/m.test(trimmed)) return "typescript";
  if (/\bfunction\b|\bvar\b|\blet\b|\bconst\b|\b=>\b|\basync\b|\bawait\b|\bconsole\b/m.test(trimmed)) return "javascript";
  if (/\bdef\b\s+\w+.*:|\bclass\b.*:|\bimport\b.*:/m.test(trimmed)) return "python";
  if (/\bfn\b\s+\w+|"\w+"\s*:/m.test(trimmed) && /\bprintln!\b|\bmacro_rules!\b/m.test(trimmed)) return "rust";
  if (/\bSELECT\b.*\bFROM\b/im.test(trimmed)) return "sql";
  if (/^\s*{/.test(trimmed) && /"[^"]+"\s*:/.test(trimmed)) return "json";
  if (/\bfunc\b.*\(.*\)|\baoi\.Print\b|\bfmt\.Print/m.test(trimmed)) return "go";
  if (/\bpublic\s+(static\s+)?(class|void|int|String)\b/m.test(trimmed)) return "java";
  if (/@interface\b|\bNSS|string\*|-\s*\(/m.test(trimmed)) return "objectivec";
  if (/^\s*#/m.test(trimmed) && /\bif\b.*\bthen\b|\bfi\b|\bdone\b/m.test(trimmed)) return "bash";
  if (/^\s*#/m.test(trimmed) && /\bdef\b|\bclass\b|\bimport\b/m.test(trimmed)) return "python";
  if (/\bCSS\b|^\.\w+\s*\{|^\#\w+\s*\{/m.test(trimmed)) return "css";
  return undefined;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [pasteCategory, setPasteCategory] = useState("general");
  const [pasteText, setPasteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [copyToast, setCopyToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<CodeSession[]>([]);
  const [switchCodeInput, setSwitchCodeInput] = useState("");
  const [switchError, setSwitchError] = useState("");

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  }

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setShowInstall(false);
    setInstallPrompt(null);
  }

  const fetchClips = useCallback(async (userCode: string) => {
    try {
      const res = await fetch(`/api/clips?code=${userCode}`);
      const data = await res.json();
      if (data.clips) {
        setClips(data.clips);
      }
    } catch (error) {
      console.error("Failed to fetch clips:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      const upperCode = urlCode.toUpperCase();
      setCurrentCode(upperCode);
      setCode(upperCode);
      fetchClips(upperCode);
      window.history.replaceState({}, "", "/dashboard");
      setSessionHistory(getCodeHistory());
      return;
    }

    const saved = getCurrentCode();
    if (!saved) {
      router.push("/");
      return;
    }
    setCode(saved);
    fetchClips(saved);
    setSessionHistory(getCodeHistory());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!code) return;
    const interval = setInterval(() => fetchClips(code), 5000);
    return () => clearInterval(interval);
  }, [code, fetchClips]);

  useEffect(() => {
    if (!code) return;

    function isUrl(text: string): boolean {
      try {
        const url = new URL(text.trim());
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }

    async function saveUrlClip(url: string) {
      try {
        const res = await fetch("/api/clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            content: url.trim(),
            type: "url",
            category: "links"
          }),
        });
        const data = await res.json();
        if (data.clip) {
          setClips((prev) => [data.clip, ...prev]);
        }
      } catch (error) {
        console.error("Failed to save URL clip:", error);
      }
    }

    function handleCopy(e: ClipboardEvent) {
      const selection = window.getSelection();
      const selectedText = selection?.toString()?.trim();

      if (selectedText && isUrl(selectedText)) {
        setCopyToast({ show: true, message: "Link copied & saved!" });
        setTimeout(() => setCopyToast({ show: false, message: "" }), 2500);
        saveUrlClip(selectedText);
      }
    }

    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, [code]);

  async function copyToClipboard(content: string, id: string) {
    const isUrl = content.startsWith("http://") || content.startsWith("https://");
    const toastMessage = isUrl ? "URL copied to clipboard!" : "Copied to clipboard!";

    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setCopyToast({ show: true, message: toastMessage });
      setTimeout(() => {
        setCopiedId(null);
        setCopyToast({ show: false, message: "" });
      }, 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(id);
      setCopyToast({ show: true, message: toastMessage });
      setTimeout(() => {
        setCopiedId(null);
        setCopyToast({ show: false, message: "" });
      }, 2000);
    }
  }

  async function deleteClip(id: string) {
    try {
      await fetch(`/api/clips/${id}`, { method: "DELETE" });
      setClips((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Failed to delete clip:", error);
    }
  }

  async function pasteClip() {
    const text = pasteText.trim();
    if (!text || !code) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, content: text, category: pasteCategory }),
      });
      const data = await res.json();
      if (data.clip) {
        setPasteText("");
        setClips((prev) => [data.clip, ...prev]);
      }
    } catch (error) {
      console.error("Failed to paste clip:", error);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearCurrentCode();
    router.push("/");
  }

  function switchToSession(sessionCode: string) {
    setCurrentCode(sessionCode);
    setCode(sessionCode);
    setClips([]);
    setLoading(true);
    fetchClips(sessionCode);
    setSessionHistory(getCodeHistory());
    setShowSessions(false);
    setSwitchCodeInput("");
    setSwitchError("");
  }

  async function joinNewCode(e: React.FormEvent) {
    e.preventDefault();
    if (!switchCodeInput.trim()) return;
    setSwitchError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        body: JSON.stringify({ code: switchCodeInput.trim() }),
      });
      const data = await res.json();
      if (data.user) {
        switchToSession(data.user.code);
      } else {
        setSwitchError("Invalid code. Please try again.");
      }
    } catch {
      setSwitchError("Something went wrong");
    }
  }

  function removeSession(sessionCode: string, e: React.MouseEvent) {
    e.stopPropagation();
    removeCodeFromHistory(sessionCode);
    setSessionHistory(getCodeHistory());
    if (sessionCode === code) {
      clearCurrentCode();
      router.push("/");
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = Date.now();
    const diff = now - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatSessionDate(ts: number) {
    const date = new Date(ts);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function isUrl(text: string): boolean {
    try { new URL(text); return true; } catch { return false; }
  }

  function getCategoryIcon(cat: string) {
    switch (cat) {
      case "links": return Link2;
      case "code": return Code;
      case "notes": return FileText;
      case "lists": return List;
      default: return MoreHorizontal;
    }
  }

  function getCategoryColor(cat: string) {
    switch (cat) {
      case "links": return "bg-violet-500/20 text-violet-300 border-violet-500/30";
      case "code": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "notes": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "lists": return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      default: return "bg-zinc-500/20 text-zinc-300 border-zinc-500/30";
    }
  }

  const filteredClips = activeCategory === "all"
    ? clips
    : clips.filter((c) => (c.category || "general") === activeCategory);

  const categoryCounts = (cat: string) =>
    cat === "all" ? clips.length : clips.filter((c) => (c.category || "general") === cat).length;

  const qrUrl = typeof window !== "undefined" ? `${window.location.origin}/dashboard?code=${code}` : "";

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Install PWA banner */}
      {showInstall && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between animate-fade-in-up">
          <span className="text-sm font-medium">Install Croxync for quick access</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleInstall} className="h-7 text-xs">
              <Download className="w-3.5 h-3.5 mr-1" /> Install
            </Button>
            <button onClick={() => setShowInstall(false)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <ClipboardCopy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading tracking-tight">Croxync</h1>
              <button
                onClick={() => setShowSessions(true)}
                className="font-mono text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20 hover:bg-violet-500/20 transition-colors flex items-center gap-1"
              >
                {code}
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setShowQr(!showQr)} className="border-border/50 bg-card hover:bg-accent">
              <QrCode className="w-4 h-4 mr-1" />QR
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchClips(code)} className="border-border/50 bg-card hover:bg-accent">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="border-border/50 bg-card hover:bg-accent">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* QR */}
        {showQr && (
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 mb-4 animate-fade-in-up">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="bg-white p-2.5 rounded-xl shrink-0 shadow-lg shadow-black/20">
                <QRCodeSVG value={qrUrl} size={100} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Scan to connect phone</p>
                <p className="text-xs text-muted-foreground mt-1">Opens dashboard with your code</p>
                <button onClick={() => { copyToClipboard(qrUrl, "qr"); setShowQr(false); }} className="text-xs text-violet-400 hover:text-violet-300 hover:underline mt-2 transition-colors">
                  Copy link instead
                </button>
              </div>
              <button onClick={() => setShowQr(false)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        )}

        {/* Sessions Modal */}
        {showSessions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <Card className="bg-card border-border w-full max-w-sm animate-fade-in-up">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-violet-400" />
                    Your Sessions
                  </h3>
                  <button onClick={() => setShowSessions(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                  {sessionHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No sessions yet</p>
                  ) : (
                    sessionHistory.map((session) => (
                      <button
                        key={session.code}
                        onClick={() => switchToSession(session.code)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                          session.code === code
                            ? "bg-violet-500/10 border-violet-500/30"
                            : "bg-card/50 border-border/50 hover:bg-accent hover:border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            session.code === code
                              ? "bg-violet-500/20 text-violet-300"
                              : "bg-zinc-500/20 text-zinc-300"
                          }`}>
                            {session.code.slice(0, 2)}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-foreground">{session.code}</p>
                            <p className="text-[10px] text-muted-foreground">{formatSessionDate(session.lastUsed)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {session.code === code && (
                            <span className="text-[10px] font-medium text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">Active</span>
                          )}
                          <button
                            onClick={(e) => removeSession(session.code, e)}
                            className="p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Remove from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Join different code</p>
                  <form onSubmit={joinNewCode} className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={switchCodeInput}
                      onChange={(e) => setSwitchCodeInput(e.target.value.toUpperCase())}
                      className="bg-input border-border/50 text-foreground placeholder:text-muted-foreground h-9 text-sm"
                      maxLength={6}
                    />
                    <Button
                      type="submit"
                      disabled={!switchCodeInput.trim()}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 h-9 px-3"
                      size="sm"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </form>
                  {switchError && <p className="text-red-400 text-xs mt-1.5">{switchError}</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = categoryCounts(cat.key);
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); if (cat.key !== "all") setPasteCategory(cat.key); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/10"
                    : "bg-card text-muted-foreground border border-transparent hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
                {count > 0 && <span className="opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Paste bar */}
        <div className="flex gap-0 items-center mb-4 group">
          <select
            value={pasteCategory}
            onChange={(e) => setPasteCategory(e.target.value)}
            className={`shrink-0 px-2.5 py-2.5 rounded-l-xl border border-r-0 border-border bg-card text-xs font-bold outline-none cursor-pointer appearance-none pr-7 transition-colors ${
              pasteCategory === "links" ? "text-violet-400" :
              pasteCategory === "code" ? "text-emerald-400" :
              pasteCategory === "notes" ? "text-amber-400" :
              pasteCategory === "lists" ? "text-rose-400" :
              "text-zinc-400"
            }`}
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            <option value="general">Other</option>
            <option value="links">Link</option>
            <option value="code">Code</option>
            <option value="notes">Note</option>
            <option value="lists">List</option>
          </select>
          <input
            type="text"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") pasteClip(); }}
            placeholder={`Paste ${pasteCategory === "links" ? "a link" : pasteCategory === "code" ? "code" : pasteCategory === "notes" ? "a note" : pasteCategory === "lists" ? "a list" : "text"} to sync...`}
            className="flex-1 px-3 py-2.5 border-y border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:bg-accent/50 transition-colors"
          />
          <Button
            onClick={pasteClip}
            disabled={saving || !pasteText.trim()}
            className="rounded-l-none rounded-r-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shrink-0 h-[42px] shadow-lg shadow-violet-500/20"
            size="sm"
          >
            <Send className="w-4 h-4 mr-1" />
            {saving ? "..." : "Send"}
          </Button>
        </div>

        {/* Clips */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            Loading clips...
          </div>
        ) : filteredClips.length === 0 ? (
          <Card className="bg-card/50 border-border/30">
            <CardContent className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-4">
                <ClipboardCopy className="w-7 h-7 text-violet-400" />
              </div>
              <p className="text-foreground font-medium">
                {activeCategory === "all" ? "No clips yet" : `No ${CATEGORIES.find(c => c.key === activeCategory)?.label?.toLowerCase()} clips`}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Select text on any page and save with Croxync
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredClips.map((clip) => {
              const isLink = clip.type === "url" || isUrl(clip.content);
              const cat = clip.category || "general";
              const CatIcon = getCategoryIcon(cat);
              const catColor = getCategoryColor(cat);
              const isCode = cat === "code";
              const lang = isCode ? detectLanguage(clip.content) : undefined;
              const isSingleLine = !clip.content.includes("\n");

              return (
                <Card key={clip.id} className={`bg-card/60 backdrop-blur-sm border-border/30 hover:bg-card/80 hover:border-border/60 transition-all ${isLink ? "border-l-2 border-l-violet-500/60" : ""} ${isCode ? "border-l-2 border-l-emerald-500/60" : ""}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 border ${catColor}`}>
                            <CatIcon className="w-2.5 h-2.5 mr-0.5" />
                            {cat}
                          </Badge>
                          {clip.source && (() => {
                            try {
                              return (
                                <a href={clip.source} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 truncate transition-colors">
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  {new URL(clip.source).hostname}
                                </a>
                              );
                            } catch { return null; }
                          })()}
                          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDate(clip.createdAt)}
                          </span>
                        </div>

                        {clip.title && !isCode && (
                          <p className="text-sm font-medium text-foreground mb-1 truncate">{clip.title}</p>
                        )}

                        {isLink ? (
                          <div className="flex items-center gap-2">
                            <a href={clip.content} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-400 hover:text-violet-300 hover:underline break-all flex-1 transition-colors">
                              {clip.content}
                            </a>
                            <button
                              onClick={(e) => { e.preventDefault(); copyToClipboard(clip.content, clip.id + "-url"); }}
                              className="shrink-0 p-1 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded transition-colors"
                              title="Copy URL"
                            >
                              {copiedId === clip.id + "-url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : isCode ? (
                          <div className="rounded-lg overflow-hidden mt-1 text-xs max-h-48 overflow-y-auto">
                            {isSingleLine ? (
                              <div className="bg-black/40 text-emerald-300 font-mono p-2">
                                {clip.content}
                              </div>
                            ) : (
                              <SyntaxHighlighter
                                language={lang || "text"}
                                style={oneDark}
                                customStyle={{
                                  margin: 0,
                                  padding: "8px 10px",
                                  fontSize: "12px",
                                  borderRadius: "8px",
                                  background: "oklch(0.08 0.014 270)",
                                }}
                                wrapLines={true}
                                showLineNumbers={clip.content.split("\n").length > 3}
                              >
                                {clip.content}
                              </SyntaxHighlighter>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap wrap-break-words">{clip.content}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(clip.content, clip.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-accent">
                          {copiedId === clip.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteClip(clip.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Copy Toast Popup */}
      {copyToast.show && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-violet-500/30">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{copyToast.message}</span>
          </div>
        </div>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
}
