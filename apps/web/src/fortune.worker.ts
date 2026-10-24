import { computeNatal, computeYear } from "@annual-fortune/core";
import type { FortuneRequest, FortuneWorkerRequest, FortuneWorkerResponse } from "@annual-fortune/core";
import { validateFortuneRequest } from "@annual-fortune/core";

function isFortuneRequest(value: unknown): value is FortuneRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  return typeof request.birthDate === "string"
    && typeof request.birthTime === "string"
    && (request.gender === "female" || request.gender === "male" || request.gender === "unspecified")
    && typeof request.city === "string"
    && typeof request.yearFrom === "number"
    && typeof request.yearTo === "number"
    && (request.detailLevel === "summary" || request.detailLevel === "standard" || request.detailLevel === "deep")
    && request.schoolSetting === "quanshu";
}

function isWorkerRequest(value: unknown): value is FortuneWorkerRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  if (!Number.isInteger(request.id) || !isFortuneRequest(request.request)) return false;
  if (request.operation === "computeNatal") return true;
  return request.operation === "computeYear"
    && typeof request.year === "number"
    && Number.isInteger(request.year);
}

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const input = event.data;
  if (!isWorkerRequest(input)) {
    const id = typeof input === "object" && input !== null && "id" in input && Number.isInteger(input.id)
      ? input.id as number
      : -1;
    self.postMessage({ id, success: false, error: "Invalid chart calculation request." } satisfies FortuneWorkerResponse);
    return;
  }

  try {
    const validationErrors = validateFortuneRequest(input.request);
    if (validationErrors.length > 0) throw new RangeError(validationErrors.join(" "));

    const response: FortuneWorkerResponse = input.operation === "computeNatal"
      ? { id: input.id, success: true, operation: input.operation, result: computeNatal(input.request) }
      : { id: input.id, success: true, operation: input.operation, result: computeYear(input.request, input.year) };
    self.postMessage(response);
  } catch (error) {
    self.postMessage({
      id: input.id,
      success: false,
      error: error instanceof Error ? error.message : "Chart calculation failed.",
    } satisfies FortuneWorkerResponse);
  }
});
