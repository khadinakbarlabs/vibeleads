import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="vl-brand">
      <span className="vl-brand-mark" aria-hidden="true" />
      VibeLeads
    </Link>
  );
}
