import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { issueApiToken } from "@/lib/auth-jwt";

/** JWT da sessão atual para chamar a API como `Bearer`, ou `null` se não há login. */
export async function getApiToken(): Promise<string | null> {
  return issueApiToken(auth, await headers());
}
