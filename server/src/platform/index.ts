// Public surface of the Platform port (ADR-0016).
export {
  platformLabel,
  clientFor,
  UnsupportedPlatformError,
  type Platform,
  type TimeControlCategory,
  type PlatformAccount,
  type ImportedGame,
  type MonthFetch,
  type PlatformClient,
  type PlatformRegistry,
} from "./types";
export { createHttpChessComClient } from "./chesscom/client";
