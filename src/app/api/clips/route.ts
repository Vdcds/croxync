import { prisma } from "@/lib/db";
import { detectCategory, detectType } from "@/lib/categories";
import { NextRequest } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const category = request.nextUrl.searchParams.get("category");

    if (!code) {
      return Response.json(
        { error: "Code is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const user = await prisma.user.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        clips: {
          where: category && category !== "all"
            ? { category: category }
            : undefined,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return Response.json(
        { error: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return Response.json({ clips: user.clips }, { headers: corsHeaders });
  } catch (error) {
    console.error("Get clips error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, content, type, category, title, source } = body;

    if (!code || !content) {
      return Response.json(
        { error: "Code and content are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const user = await prisma.user.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!user) {
      return Response.json(
        { error: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const resolvedType = type || detectType(content);
    const resolvedCategory = category || detectCategory(content, resolvedType);

    const clip = await prisma.clip.create({
      data: {
        content,
        type: resolvedType,
        category: resolvedCategory,
        title: title || null,
        source: source || null,
        userId: user.id,
      },
    });

    return Response.json({ clip }, { headers: corsHeaders });
  } catch (error) {
    console.error("Create clip error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}