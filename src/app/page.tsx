"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardCopy, Sparkles, ArrowRight, Link2, QrCode } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newCode, setNewCode] = useState<string | null>(null);

  async function createNewUser() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", { method: "POST", body: JSON.stringify({}) });
      const data = await res.json();
      if (data.user) {
        localStorage.setItem("croxync-code", data.user.code);
        setNewCode(data.user.code);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function joinWithCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.user) {
        localStorage.setItem("croxync-code", data.user.code);
        router.push("/dashboard");
      } else {
        setError("Invalid code. Please try again.");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const qrUrl = typeof window !== "undefined" && newCode
    ? `${window.location.origin}/dashboard?code=${newCode}`
    : "";

  if (newCode) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="mx-auto max-w-md px-4 py-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-sm text-green-400">
              <ClipboardCopy className="w-4 h-4" />
              Connected!
            </div>

            <h2 className="text-2xl font-bold">Your Sync Code</h2>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <p className="font-mono text-4xl font-bold text-cyan-400 tracking-widest">{newCode}</p>
              <p className="text-sm text-slate-400 mt-2">Save this code — it never changes</p>
            </div>

            <div className="bg-white p-4 rounded-xl inline-block">
              <QRCodeSVG value={qrUrl} size={180} />
            </div>

            <p className="text-sm text-slate-400">
              Scan this QR code on your phone to connect
            </p>

            <Button
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
              size="lg"
              onClick={() => router.push("/dashboard")}
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300">
            <ClipboardCopy className="w-4 h-4" />
            <span>Universal Clipboard Sync</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Your clipboard,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              everywhere
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Like AirDrop, but for everything. Save links, text, and notes from
            any device and access them instantly on your phone or browser.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button
              size="lg"
              onClick={createNewUser}
              disabled={loading}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {loading ? "Creating..." : "Get Started"}
            </Button>
          </div>

          <div className="mt-12 max-w-md mx-auto">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Already have a code?
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Enter your sync code to access your clips
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={joinWithCode} className="flex gap-2">
                  <Input
                    placeholder="Enter your code (e.g. ABC123)"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    maxLength={6}
                  />
                  <Button
                    type="submit"
                    disabled={loading || !code.trim()}
                    variant="secondary"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
                {error && (
                  <p className="text-red-400 text-sm mt-2">{error}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Select & Save</CardTitle>
                <CardDescription className="text-slate-400">
                  Highlight any text on any webpage — a floating button lets you save it instantly
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Scan & Connect</CardTitle>
                <CardDescription className="text-slate-400">
                  Scan the QR code on your phone. One-time setup, always connected.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Access Anywhere</CardTitle>
                <CardDescription className="text-slate-400">
                  Install as a PWA on your phone for instant access to all your clips
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}