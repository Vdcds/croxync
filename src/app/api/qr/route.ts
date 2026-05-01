import { NextRequest } from "next/server";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  const baseUrl = request.nextUrl.origin;
  const targetUrl = `${baseUrl}/dashboard?code=${code.toUpperCase()}`;

  try {
    const svg = await QRCode.toString(targetUrl, {
      type: "svg",
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    return new Response("Failed to generate QR code", { status: 500 });
  }
}