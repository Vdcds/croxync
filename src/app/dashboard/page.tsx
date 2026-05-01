"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCopy, Trash2, ExternalLink, Copy, LogOut, RefreshCw, Clock, QrCode, X, Link2, Code, FileText, List, MoreHorizontal } from "lucide-react";

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

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

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

  async function copyToClipboard(content: string, id: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
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

  function logout() {
    localStorage.removeItem("croxync-code");
    router.push("/");
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isUrl(text: string): boolean {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
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
    : clips.filter((c) => c.category === activeCategory);

  const qrUrl = typeof window !== "undefined" ? `${window.location.origin}/dashboard?code=${code}` : "";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Clips</h1>
              <span className="font-mono text-sm text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">{code}</span>
            </div>
            <p className="text-slate-500 text-xs mt-1">Auto-syncs every 5 seconds</p>
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

        {showQr && (
          <Card className="bg-white/5 border-white/10 mb-4">
            <CardContent className="py-5 flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-3">
                <h3 className="text-sm font-medium text-slate-300">Scan to connect another device</h3>
                <button onClick={() => setShowQr(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="bg-white p-3 rounded-xl"><QRCodeSVG value={qrUrl} size={180} /></div>
              <p className="text-xs text-slate-500 mt-3 text-center">Opens dashboard with your code pre-filled</p>
            </CardContent>
          </Card>
        )}

        {/* Category tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = cat.key === "all" ? clips.length : clips.filter((c) => c.category === cat.key).length;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                    : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
                {count > 0 && <span className="ml-0.5 opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>

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
                Select text on any page and save it with the Croxync extension
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filteredClips.map((clip) => {
              const isLink = clip.type === "url" || isUrl(clip.content);
              const CatIcon = getCategoryIcon(clip.category || "general");
              const catColor = getCategoryColor(clip.category || "general");
              return (
                <Card key={clip.id} className={`bg-white/5 border-white/10 hover:bg-white/[0.07] transition-all ${isLink ? "border-l-2 border-l-indigo-500/60" : ""}`}>
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 border ${catColor}`}>
                            <CatIcon className="w-2.5 h-2.5 mr-0.5" />
                            {clip.category || "general"}
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

                        {clip.title && (
                          <p className="text-sm font-medium text-white mb-1 truncate">{clip.title}</p>
                        )}

                        <div className="text-sm text-slate-300 break-all">
                          {isLink ? (
                            <a href={clip.content} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline">
                              {clip.content}
                            </a>
                          ) : (
                            <p className={`whitespace-pre-wrap ${clip.category === "code" ? "font-mono text-xs bg-slate-800/50 rounded p-1.5" : ""}`}>
                              {clip.content}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(clip.content, clip.id)} className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10">
                          {copiedId === clip.id ? <Copy className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
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
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
}