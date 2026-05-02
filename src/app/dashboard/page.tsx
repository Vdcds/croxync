"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCopy, Trash2, ExternalLink, Copy, LogOut, RefreshCw, Clock, QrCode, X, Link2, Code, FileText, List, MoreHorizontal, Check, Plus, Send, CheckCircle } from "lucide-react";
import { detectCategory } from "@/lib/categories";

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
      localStorage.setItem("croxync-code", upperCode);
      setCode(upperCode);
      fetchClips(upperCode);
      window.history.replaceState({}, "", "/dashboard");
      return;
    }

    const saved = localStorage.getItem("croxync-code");
    if (!saved) {
      router.push("/");
      return;
    }
    setCode(saved);
    fetchClips(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!code) return;
    const interval = setInterval(() => fetchClips(code), 5000);
    return () => clearInterval(interval);
  }, [code, fetchClips]);

  // Global copy detection for URLs
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
        // Show popup notification
        setCopyToast({ show: true, message: "Link copied & saved!" });
        setTimeout(() => setCopyToast({ show: false, message: "" }), 2500);

        // Save the URL to clips
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
    localStorage.removeItem("croxync-code");
    router.push("/");
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
      case "links": return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      case "code": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "notes": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "lists": return "bg-pink-500/20 text-pink-300 border-pink-500/30";
      default: return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  }

  const filteredClips = activeCategory === "all"
    ? clips
    : clips.filter((c) => (c.category || "general") === activeCategory);

  const categoryCounts = (cat: string) =>
    cat === "all" ? clips.length : clips.filter((c) => (c.category || "general") === cat).length;

  const qrUrl = typeof window !== "undefined" ? `${window.location.origin}/dashboard?code=${code}` : "";

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Clips</h1>
            <span className="font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">{code}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowQr(!showQr)} className="border-white/10 bg-white/5 hover:bg-white/10">
              <QrCode className="w-4 h-4 mr-1" />QR
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchClips(code)} className="border-white/10 bg-white/5 hover:bg-white/10">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="border-white/10 bg-white/5 hover:bg-white/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* QR */}
        {showQr && (
          <Card className="bg-white/5 border-white/10 mb-4">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="bg-white p-2 rounded-lg shrink-0">
                <QRCodeSVG value={qrUrl} size={100} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">Scan to connect phone</p>
                <p className="text-xs text-slate-500 mt-1">Opens dashboard with your code</p>
                <button onClick={() => { copyToClipboard(qrUrl, "qr"); setShowQr(false); }} className="text-xs text-cyan-400 hover:underline mt-2">
                  Copy link instead
                </button>
              </div>
              <button onClick={() => setShowQr(false)} className="text-slate-500 hover:text-white shrink-0">
                <X className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        )}

        {/* Category tabs */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = categoryCounts(cat.key);
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); if (cat.key !== "all") setPasteCategory(cat.key); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                    : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
                {count > 0 && <span className="opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Paste bar with category selector */}
        <div className="flex gap-2 items-center mb-4">
          <select
            value={pasteCategory}
            onChange={(e) => setPasteCategory(e.target.value)}
            className={`shrink-0 px-2.5 py-2 rounded-l-lg border border-r-0 border-white/10 bg-white/5 text-xs font-semibold outline-none cursor-pointer appearance-none pr-7 pl-2.5 transition-colors ${
              pasteCategory === "links" ? "text-indigo-300" :
              pasteCategory === "code" ? "text-emerald-300" :
              pasteCategory === "notes" ? "text-amber-300" :
              pasteCategory === "lists" ? "text-pink-300" :
              "text-slate-300"
            }`}
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
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
            className="flex-1 px-3 py-2 border border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-colors"
          />
          <Button
            onClick={pasteClip}
            disabled={saving || !pasteText.trim()}
            className="bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shrink-0"
            size="sm"
          >
            <Send className="w-4 h-4 mr-1" />
            {saving ? "..." : "Send"}
          </Button>
        </div>

        {/* Clips */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading clips...</div>
        ) : filteredClips.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-16 text-center">
              <ClipboardCopy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                {activeCategory === "all" ? "No clips yet" : `No ${CATEGORIES.find(c => c.key === activeCategory)?.label?.toLowerCase()} clips`}
              </p>
              <p className="text-slate-500 text-sm mt-1">
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
                <Card key={clip.id} className={`bg-white/5 border-white/10 hover:bg-white/[0.07] transition-all ${isLink ? "border-l-2 border-l-indigo-500/60" : ""} ${isCode ? "border-l-2 border-l-emerald-500/60" : ""}`}>
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
                                <a href={clip.source} target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5 truncate">
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  {new URL(clip.source).hostname}
                                </a>
                              );
                            } catch { return null; }
                          })()}
                          <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDate(clip.createdAt)}
                          </span>
                        </div>

                        {clip.title && !isCode && (
                          <p className="text-sm font-medium text-white mb-1 truncate">{clip.title}</p>
                        )}

                        {/* Content display */}
                        {isLink ? (
                          <div className="flex items-center gap-2">
                            <a href={clip.content} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline break-all flex-1">
                              {clip.content}
                            </a>
                            <button
                              onClick={(e) => { e.preventDefault(); copyToClipboard(clip.content, clip.id + "-url"); }}
                              className="shrink-0 p-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition-colors"
                              title="Copy URL"
                            >
                              {copiedId === clip.id + "-url" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : isCode ? (
                          <div className="rounded-md overflow-hidden mt-1 text-xs max-h-48 overflow-y-auto">
                            {isSingleLine ? (
                              <div className="bg-slate-900/80 text-emerald-300 font-mono p-2">
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
                                  borderRadius: "6px",
                                  background: "#0c1222",
                                }}
                                wrapLines={true}
                                showLineNumbers={clip.content.split("\n").length > 3}
                              >
                                {clip.content}
                              </SyntaxHighlighter>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-300 whitespace-pre-wrap wrap-break-words">{clip.content}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(clip.content, clip.id)} className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10">
                          {copiedId === clip.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteClip(clip.id)} className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10">
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 bg-linear-0-to-r from-cyan-500 to-blue-600 text-white px-4 py-2.5 rounded-lg shadow-lg shadow-cyan-500/20">
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
      <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
}