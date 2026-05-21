import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { normalizeEmployeeId } from "./employeeId";
import { prisma } from "./db";

const AUTH_COOKIE = "wfh_auth";

export interface SessionUser {
  id: string;
  email: string;
  employeeId?: string;
  fullName: string;
  role: "EMPLOYEE" | "ADMIN";
}

type VerifyCredentialsResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "ACTIVATION_REQUIRED" };

export type ActivateAccountResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "NOT_FOUND" | "ALREADY_ACTIVE" | "WRONG_CODE" | "MISSING_CODE" };

function authSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export async function verifyCredentials(
  identifier: string,
  password: string
): Promise<VerifyCredentialsResult> {
  const normalizedIdentifier = identifier.trim();
  const normalizedEmployeeId = normalizeEmployeeId(normalizedIdentifier);
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedIdentifier }, { employeeId: normalizedEmployeeId }]
    }
  });
  if (!user) return { ok: false, reason: "INVALID_CREDENTIALS" };
  if (user.requiresActivation) {
    return { ok: false, reason: "ACTIVATION_REQUIRED" };
  }
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return { ok: false, reason: "INVALID_CREDENTIALS" };

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      employeeId: user.employeeId ?? undefined,
      fullName: user.fullName,
      role: user.role
    } as SessionUser
  };
}

export async function activateEmployeeAccount(
  employeeId: string,
  activationCode: string,
  newPassword: string
): Promise<ActivateAccountResult> {
  const normalizedEmployeeId = normalizeEmployeeId(employeeId);
  const user = await prisma.user.findFirst({ where: { employeeId: normalizedEmployeeId } });
  if (!user) {
    return { ok: false, reason: "NOT_FOUND" };
  }
  if (!user.requiresActivation) {
    return { ok: false, reason: "ALREADY_ACTIVE" };
  }
  if (!user.activationCodeHash) {
    return { ok: false, reason: "MISSING_CODE" };
  }

  const isValidCode = await bcrypt.compare(activationCode, user.activationCodeHash);
  if (!isValidCode) {
    return { ok: false, reason: "WRONG_CODE" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      requiresActivation: false,
      activationCodeHash: null
    }
  });

  return {
    ok: true,
    user: {
      id: updated.id,
      email: updated.email,
      employeeId: updated.employeeId ?? undefined,
      fullName: updated.fullName,
      role: updated.role
    } as SessionUser
  };
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(authSecret());

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    // Secure cookies only work over HTTPS. For HTTP deployments (e.g. IP:3000), set COOKIE_SECURE=false.
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/"
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, authSecret());
    return {
      id: String(payload.id),
      email: String(payload.email),
      employeeId: payload.employeeId ? String(payload.employeeId) : undefined,
      fullName: String(payload.fullName),
      role: payload.role as SessionUser["role"]
    };
  } catch {
    return null;
  }
}
