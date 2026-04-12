import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../db/prisma";

let clientInstance: Anthropic | null = null;

export async function getClaudeClient(): Promise<Anthropic> {
  if (clientInstance) return clientInstance;

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const apiKey = settings?.claudeApiKey || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) throw new Error("Claude API key not configured. Go to Settings to add it.");

  clientInstance = new Anthropic({ apiKey });
  return clientInstance;
}

export function resetClient() {
  clientInstance = null;
}

export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const client = await getClaudeClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.3,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}
