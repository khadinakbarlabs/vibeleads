import { NextResponse } from "next/server";

export function rejectProductionDevRoute(): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  return NextResponse.json(
    { ok: false, error: "not_found" },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
