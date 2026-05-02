import { apiUrl } from "../../../api";
import { getOrCreateUserId } from "../../../shared/lib/userId";

export type AuthResponse = {
  token: string;
  userId: string;
  email: string;
};

async function parseJsonOrText(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function buildErrorMessage(res: Response, body: any): string {
  if (typeof body === "string" && body.trim().length > 0) {
    return `${res.status} ${res.statusText}: ${body}`;
  }
  if (body && typeof body === "object") {
    const msg = body.message || body.error || JSON.stringify(body);
    return `${res.status} ${res.statusText}: ${msg}`;
  }
  return `${res.status} ${res.statusText}`;
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(apiUrl("/api/auth/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": getOrCreateUserId() },
    body: JSON.stringify({ email, password }),
  });
  const body = await parseJsonOrText(res);
  if (!res.ok) {
    throw new Error(buildErrorMessage(res, body));
  }
  return body as AuthResponse;
}

export async function signin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(apiUrl("/api/auth/signin"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": getOrCreateUserId() },
    body: JSON.stringify({ email, password }),
  });
  const body = await parseJsonOrText(res);
  if (!res.ok) {
    throw new Error(buildErrorMessage(res, body));
  }
  return body as AuthResponse;
}

