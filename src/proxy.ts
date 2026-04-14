import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the middleware convention to `proxy`. The exported
// function must now be named `proxy` (not `middleware`) — otherwise the
// runtime silently skips it.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on every request EXCEPT Next internals and static image assets.
    // We explicitly include both the bare `/` (so `/app` itself triggers
    // the auth redirect) and any sub-path via the negative-lookahead branch.
    "/",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).+)",
  ],
};
