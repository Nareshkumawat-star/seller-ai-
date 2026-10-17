import { InferenceError } from "@/lib/ai/ollama-client";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    hint?: string;
    fields?: Record<string, string>;
  };
};

export function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: { hint?: string; fields?: Record<string, string>; headers?: Record<string, string> },
): Response {
  const body: ApiErrorBody = { error: { code, message, ...(extra?.hint ? { hint: extra.hint } : {}), ...(extra?.fields ? { fields: extra.fields } : {}) } };
  return Response.json(body, { status, headers: extra?.headers });
}

export function inferenceErrorResponse(error: InferenceError): Response {
  const status =
    error.code === "timeout"
      ? 504
      : error.code === "model_missing" || error.code === "offline" || error.code === "overloaded"
        ? 503
        : error.code === "unsupported"
          ? 422
          : 502;

  const message =
    error.code === "model_missing"
      ? "The configured AI model is not installed on the inference host."
      : error.code === "offline"
        ? "Cannot reach the local AI runtime."
        : error.message;

  return jsonError(status, error.code, message, { hint: error.hint });
}

/** Body size guard for JSON endpoints (images are handled by a separate multipart route). */
export function contentLengthExceeded(request: Request, limitBytes: number): boolean {
  const header = request.headers.get("content-length");
  if (!header) return false;
  const size = Number(header);
  return Number.isFinite(size) && size > limitBytes;
}
