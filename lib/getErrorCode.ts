// lib/getErrorCode.ts
export function getErrorCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const anyErr = err as { code?: unknown };
    return typeof anyErr.code === "string" ? anyErr.code : undefined;
  }
  return undefined;
}
