import { randomBytes } from "crypto";

export function generateWrapperId(): string {
  return `wrp${randomBytes(12).toString("hex")}`;
}
