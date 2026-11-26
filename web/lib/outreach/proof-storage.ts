/** Private storage reference helpers for native outreach proof screenshots. */

export const OUTREACH_PROOF_BUCKET = "outreach-proofs";
const PREFIX = `storage://${OUTREACH_PROOF_BUCKET}/`;

export interface OutreachProofReference {
  bucket: typeof OUTREACH_PROOF_BUCKET;
  path: string;
}

export function isOutreachProofReference(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function parseOutreachProofReference(
  value: string | null | undefined,
): OutreachProofReference | null {
  if (!isOutreachProofReference(value)) return null;
  const path = value.slice(PREFIX.length);
  if (
    !path ||
    path
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return null;
  }
  return { bucket: OUTREACH_PROOF_BUCKET, path };
}
