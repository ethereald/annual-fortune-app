import type { FortuneRequest } from "./types.js";
import type { AnnualCalculation, NatalCalculation } from "./engine.js";

export type FortuneWorkerRequest =
  | { id: number; operation: "computeNatal"; request: FortuneRequest }
  | { id: number; operation: "computeYear"; request: FortuneRequest; year: number };

export type FortuneWorkerResponse =
  | { id: number; success: true; operation: "computeNatal"; result: NatalCalculation }
  | { id: number; success: true; operation: "computeYear"; result: AnnualCalculation }
  | { id: number; success: false; error: string };
