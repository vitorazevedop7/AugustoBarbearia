import { NextResponse, type NextRequest } from "next/server";
import { REQUESTED_PATH_HEADER } from "@/lib/requested-path";

/**
 * Repassa ao layout da administração o caminho e a busca pedidos. O valor
 * sempre vem daqui, e não de um cabeçalho que o navegador tenha mandado.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  const { pathname, search } = request.nextUrl;
  headers.set(REQUESTED_PATH_HEADER, `${pathname}${search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/admin/:path*" };
