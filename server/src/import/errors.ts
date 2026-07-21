/** Thrown when the chess.com username to import does not exist. */
export class UnknownUsernameError extends Error {
  constructor(username: string) {
    super(`Unknown chess.com username: ${username}`);
    this.name = "UnknownUsernameError";
  }
}
