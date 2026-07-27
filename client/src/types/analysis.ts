/** Determinate progress of the engine analysis pass (GET /api/analyze/status). */
export interface AnalysisStatus {
  running: boolean;
  total: number;
  done: number;
}
