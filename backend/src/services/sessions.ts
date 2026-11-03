import { createHash, randomBytes } from "node:crypto";
type Session = { userId: string; expiresAt: number; credentialVersion: string };
export class Sessions {
  private entries = new Map<string, Session>();
  constructor(
    private ttlMs = 3600000,
    private now = Date.now,
  ) {}
  private key(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
  issue(userId: string, credentialVersion = "") {
    for (const [key, value] of this.entries)
      if (value.expiresAt <= this.now()) this.entries.delete(key);
    if (this.entries.size >= 10000) throw new Error("Session capacity reached");
    const token = randomBytes(32).toString("base64url");
    this.entries.set(this.key(token), {
      userId,
      expiresAt: this.now() + this.ttlMs,
      credentialVersion: this.key(credentialVersion),
    });
    return { token, expiresIn: Math.floor(this.ttlMs / 1000) };
  }
  read(token: string) {
    const key = this.key(token),
      value = this.entries.get(key);
    if (!value || value.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return value;
  }
  matchesCredential(token: string, credentialVersion: string) {
    return this.read(token)?.credentialVersion === this.key(credentialVersion);
  }
  revoke(token: string) {
    this.entries.delete(this.key(token));
  }
  revokeUser(userId: string) {
    for (const [key, value] of this.entries)
      if (value.userId === userId) this.entries.delete(key);
  }
}
