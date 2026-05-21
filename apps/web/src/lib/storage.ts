import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export function getStorageRootDir() {
  return resolve(process.env.STORAGE_ROOT ?? join(process.cwd(), "storage"));
}

const SCREENSHOT_DIR = join(getStorageRootDir(), "screenshots");

export async function storeBase64Screenshot(filename: string, imageBase64: string) {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const target = join(SCREENSHOT_DIR, filename);
  await writeFile(target, Buffer.from(imageBase64, "base64"));
  return `screenshots/${filename}`;
}

export function signStorageKey(storageKey: string) {
  const secret = process.env.SCREENSHOT_SIGNING_SECRET ?? "dev-secret";
  return createHmac("sha256", secret).update(storageKey).digest("hex");
}

export function verifySignedStorageKey(storageKey: string, signature: string) {
  return signStorageKey(storageKey) === signature;
}
