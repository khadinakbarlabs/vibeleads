import Link from "next/link";
import { DraftForm } from "@/components/outreach/DraftForm";

export const metadata = { title: "Draft outreach" };

export default function NewOutreachPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-3xl font-semibold">Draft an outreach message</h1>
      <p>Review your message and choose how to send it. This workspace can read past form campaigns. Bulk form submission is a separate hosted service.</p>
      <DraftForm />
      <nav className="flex gap-5 underline">
        <Link href="/workspace">Open the prospecting workspace</Link>
        <Link href="/outreach">Past campaigns</Link>
      </nav>
    </main>
  );
}
