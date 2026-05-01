import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (code) {
      // Try to find existing user
      const user = await prisma.user.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (user) {
        return Response.json({ user: { id: user.id, code: user.code } });
      }

      return Response.json({ error: "Invalid code" }, { status: 404 });
    }

    // Create new user with random code
    let newCode = generateCode();
    let existing = await prisma.user.findUnique({ where: { code: newCode } });

    while (existing) {
      newCode = generateCode();
      existing = await prisma.user.findUnique({ where: { code: newCode } });
    }

    const user = await prisma.user.create({
      data: { code: newCode },
    });

    return Response.json({ user: { id: user.id, code: user.code } });
  } catch (error) {
    console.error("Auth error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
