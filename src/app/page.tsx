"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardCopy, Sparkles, ArrowRight, Link2, QrCode, Zap, Shield, Smartphone } from "lucide-react";

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
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
            <ClipboardCopy className="w-4 h-4" />
            Connected!
          </div>

          <h2 className="text-3xl font-bold font-heading tracking-tight">Your Sync Code</h2>

          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-xl shadow-black/20">
            <p className="font-mono text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 tracking-widest">{newCode}</p>
            <p className="text-sm text-muted-foreground mt-2">Save this code — it never changes</p>
          </div>

          <div className="bg-white p-4 rounded-2xl inline-block shadow-xl shadow-black/20">
            <QRCodeSVG value={qrUrl} size={180} />
          </div>

          <p className="text-sm text-muted-foreground">
            Scan this QR code on your phone to connect
          </p>

          <Button
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 h-12 text-base font-semibold"
            size="lg"
            onClick={() => router.push("/dashboard")}
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-violet-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Hero */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary font-medium">
            <Zap className="w-4 h-4" />
            Universal Clipboard Sync
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold font-heading tracking-tight leading-[1.1]">
            Your clipboard,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400">
              everywhere
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed">
            Like AirDrop, but for everything. Save links, text, and code from
            any device — access them instantly on your phone or browser.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Button
              size="lg"
              onClick={createNewUser}
              disabled={loading}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 h-12 px-8 text-base font-semibold"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {loading ? "Creating..." : "Get Started — Free"}
            </Button>
          </div>

          {/* Join card */}
          <div className="mt-10 max-w-md mx-auto">
            <Card className="bg-card/60 backdrop-blur-sm border-border/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground flex items-center gap-2 text-base">
                  <Link2 className="w-4 h-4 text-primary" />
                  Already have a code?
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter your sync code to access your clips
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={joinWithCode} className="flex gap-2">
                  <Input
                    placeholder="Enter your code (e.g. ABC123)"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="bg-input border-border/50 text-foreground placeholder:text-muted-foreground h-11"
                    maxLength={6}
                  />
                  <Button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 h-11 px-4"
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
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-8 max-w-4xl mx-auto">
          <Card className="bg-card/40 backdrop-blur-sm border-border/20 hover:border-border/50 hover:bg-card/60 transition-all group">
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <ClipboardCopy className="w-5 h-5 text-violet-400" />
              </div>
              <CardTitle className="text-foreground text-base">Select & Save</CardTitle>
              <CardDescription className="text-muted-foreground">
                Highlight any text on any webpage — a floating button lets you save it instantly
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-card/40 backdrop-blur-sm border-border/20 hover:border-border/50 hover:bg-card/60 transition-all group">
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <QrCode className="w-5 h-5 text-fuchsia-400" />
              </div>
              <CardTitle className="text-foreground text-base">Scan & Connect</CardTitle>
              <CardDescription className="text-muted-foreground">
                Scan the QR code on your phone. One-time setup, always connected.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-card/40 backdrop-blur-sm border-border/20 hover:border-border/50 hover:bg-card/60 transition-all group">
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Smartphone className="w-5 h-5 text-pink-400" />
              </div>
              <CardTitle className="text-foreground text-base">Access Anywhere</CardTitle>
              <CardDescription className="text-muted-foreground">
                Install as a PWA on your phone for instant access to all your clips
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-muted-foreground/60">
          Croxync — Universal Clipboard Sync
        </div>
      </div>
    </main>
  );
}