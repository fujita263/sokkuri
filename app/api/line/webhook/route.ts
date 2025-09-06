// app/api/line/webhook/route.ts
import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response("ok", { status: 200 });
}

export async function POST(req: NextRequest) {
  return new Response("ok", { status: 200 });
}
