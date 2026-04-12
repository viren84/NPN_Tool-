import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { askClaude } from "@/lib/ai/claude";

const FAQ_SYSTEM = `You are an AI help assistant built into a Health Canada NPN Filing Tool.
You help users understand the NPN application process, each step of the wizard, and Health Canada regulatory requirements.

You know about:
- NHP Regulations (NHPR) and application classes (I, II, III)
- PLA (Product Licence Application) process and documents
- NNHPD monographs and NHPID ingredient database
- LNHPD licensed product precedents
- Bilingual labelling requirements (NHPR Sections 86-95)
- GMP compliance and Site Licence requirements
- ePost Connect submission process
- Common rejection reasons and how to avoid them

Keep answers concise and practical. If a question is about a specific wizard step, explain what that step does and why it matters.
Include relevant Health Canada links where helpful.`;

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question, context } = await req.json();
  if (!question) return NextResponse.json({ error: "Question required" }, { status: 400 });

  // Check cache first
  const cached = await prisma.faqCache.findUnique({ where: { question: question.toLowerCase().trim() } });
  if (cached) return NextResponse.json({ answer: cached.answer, cached: true });

  const contextInfo = context ? `\n\nUser is currently on: ${context}` : "";

  const answer = await askClaude(
    FAQ_SYSTEM,
    question + contextInfo,
    { maxTokens: 1500, temperature: 0.3 }
  );

  // Cache the answer
  await prisma.faqCache.upsert({
    where: { question: question.toLowerCase().trim() },
    update: { answer },
    create: { question: question.toLowerCase().trim(), answer },
  }).catch(() => {}); // ignore cache errors

  return NextResponse.json({ answer, cached: false });
}
