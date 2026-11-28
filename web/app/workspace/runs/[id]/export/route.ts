import type { NextRequest } from "next/server";
import { workspaceSellerDataset, workspaceRun } from "@/lib/workspace/apify";
import { workspaceAccount } from "@/lib/workspace/auth";
import { datasetCsv, pageNumber } from "@/lib/workspace/data-view";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await workspaceAccount();
  if (!session)
    return new Response("Sign in with Apify to download this dataset.", {
      status: 401,
      headers: privateHeaders,
    });
  const format = request.nextUrl.searchParams.get("format");
  if (format !== "csv" && format !== "json")
    return new Response("Choose CSV or JSON.", {
      status: 400,
      headers: privateHeaders,
    });
  const page = pageNumber(request.nextUrl.searchParams.get("page"));
  const view = request.nextUrl.searchParams.get("view");
  if (view !== null && view !== "results")
    return new Response(
      "For historical evidence, open the original run in Apify.",
      { status: 400, headers: privateHeaders },
    );
  try {
    const { id } = await context.params;
    const run = await workspaceRun(session.accessToken, session.accountId, id);
    if (!run)
      return new Response("Run not found.", {
        status: 404,
        headers: privateHeaders,
      });
    const { rows } = await workspaceSellerDataset(session, run, page);
    return new Response(
      format === "csv" ? datasetCsv(rows) : JSON.stringify(rows, null, 2),
      {
        headers: {
          ...privateHeaders,
          "Content-Type":
            format === "csv"
              ? "text/csv; charset=utf-8"
              : "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="vibeleads-${run.id}-page-${page}.${format}"`,
        },
      },
    );
  } catch {
    return new Response("Apify could not return this dataset.", {
      status: 502,
      headers: privateHeaders,
    });
  }
}
