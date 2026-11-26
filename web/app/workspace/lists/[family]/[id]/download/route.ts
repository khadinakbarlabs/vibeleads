import { workspaceAccount } from "@/lib/workspace/auth";
import { request, ApifyRequestError } from "@/lib/workspace/apify";
import {
  isCollection,
  listId,
  savedDownload,
} from "@/lib/workspace/saved-lists";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ family: string; id: string }> },
) {
  const account = await workspaceAccount();
  const error = (status: number, text: string) =>
    new Response(text, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!account) return error(401, "Sign in with Apify to download your list.");
  const { family, id } = await params;
  if (!isCollection(family) || !listId(id))
    return error(404, "List not found.");
  try {
    return (
      (await savedDownload(
        (path, token) => request(path, token, 120_000),
        account,
        family,
        id,
      )) ?? error(404, "List not found.")
    );
  } catch (e) {
    return e instanceof ApifyRequestError && e.status === 401
      ? error(401, "Sign in again to open your list.")
      : error(503, "The saved list is temporarily unavailable.");
  }
}
