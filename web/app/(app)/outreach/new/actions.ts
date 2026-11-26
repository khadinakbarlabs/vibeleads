"use server";

import { z } from "zod";
import { requireAccount } from "@/lib/auth/server";
import { anthropic, MODELS } from "@/lib/ai/client";

export type DraftMessageResult =
  | { ok: true; subject: string; message: string }
  | { ok: false; error: string };

const DraftInput = z.object({
  businessType: z.string().trim().min(2).max(200),
  location: z.string().trim().max(200).optional(),
  pitch: z.string().trim().max(2000).optional(),
  senderName: z.string().trim().max(120).optional(),
  senderCompany: z.string().trim().max(200).optional(),
});

export async function draftOutreachMessage(input: {
  businessType: string;
  location?: string;
  pitch?: string;
  senderName?: string;
  senderCompany?: string;
}): Promise<DraftMessageResult> {
  await requireAccount();
  const parsed = DraftInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the target business and offer." };
  const { businessType, location, pitch, senderName, senderCompany } = parsed.data;

  const system = [
    "You write short outreach messages that get submitted through a business's website contact form.",
    "Rules:",
    "- 55–95 words, plain text, no markdown, no links, no signature block.",
    '- Open by addressing the business with the literal token {{business_name}} exactly once (e.g. "Hi {{business_name}} team,"). Use no other placeholders or merge tags.',
    "- Sound like one real person writing to a local business owner — warm, direct, specific to the kind of business.",
    "- State the offer plainly and end with one low-friction question as the call to action.",
    '- NEVER fabricate specifics you cannot know (no "I saw your recent post", no fake compliments, no invented stats). The only thing you know about the recipient is their business type and city.',
    '- No exclamation points. No spammy phrasing ("act now", "limited time", "guaranteed").',
    'Respond with ONLY a JSON object: {"subject": "...", "message": "..."} — subject 4–8 words, no quotes inside values that break JSON.',
  ].join("\n");

  const ctx = [
    `Business type: ${businessType}`,
    location ? `Location: ${location}` : null,
    pitch ? `What the sender offers: ${pitch}` : null,
    senderName ? `Sender name: ${senderName}` : null,
    senderCompany ? `Sender company: ${senderCompany}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await anthropic().messages.create({
      model: MODELS.haiku,
      max_tokens: 600,
      system,
      messages: [
        {
          role: "user",
          content: `Write the outreach message for this campaign.\n\n${ctx}`,
        },
      ],
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    // Tolerate prose around the JSON by extracting the first {...} block.
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return { ok: false, error: "Could not parse the draft. Try again." };
    }
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      subject?: unknown;
      message?: unknown;
    };
    const subject =
      typeof parsed.subject === "string" ? parsed.subject.trim() : "";
    const message =
      typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (message.length < 20) {
      return { ok: false, error: "The draft came back too short. Try again." };
    }
    return { ok: true, subject, message };
  } catch {
    return { ok: false, error: "The draft is unavailable. Try again later." };
  }
}
