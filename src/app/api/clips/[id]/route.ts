import { prisma } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.clip.delete({
      where: { id },
    });

    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("Delete clip error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
