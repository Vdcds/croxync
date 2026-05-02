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
    // Return as PNG data URL for better compatibility
    const dataUrl = await QRCode.toDataURL(targetUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    // Convert data URL to buffer
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    // Return a fallback SVG QR code
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 292 292">
      <rect fill="#fff" width="292" height="292"/>
      <text x="146" y="146" text-anchor="middle" font-size="14" fill="#666">QR: ${code}</text>
    </svg>`;
    
    return new Response(fallbackSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=60",
      },
    });
  }
}