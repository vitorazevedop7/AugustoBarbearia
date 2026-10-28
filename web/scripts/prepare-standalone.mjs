import { cp } from "node:fs/promises";

// O servidor standalone precisa dos assets junto ao código rastreado pelo Next.
await Promise.all([
  cp("public", ".next/standalone/public", { recursive: true }),
  cp(".next/static", ".next/standalone/.next/static", { recursive: true }),
]);
