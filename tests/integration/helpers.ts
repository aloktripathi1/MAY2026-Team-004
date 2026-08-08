export const BASE_URL = (process.env.SANGAM_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const INSTITUTIONAL_DOMAIN = "ds.study.iitm.ac.in";

export const SIGNUP_PATH = "/api/auth/signup";
export const LOGIN_PATH = "/api/auth/login";
export const LOGOUT_PATH = "/api/auth/logout";
export const ME_PATH = "/api/auth/me";

/**
 * Real, seeded team accounts (prisma/seed.ts) used for role-scoped tests.
 * Anonymous requests must not receive a privileged session — authenticate
 * for real instead.
 */
export const SEEDED_ACCOUNTS = {
  /** Ananya Rao: Admin/CodeChef, Coordinator/E-Cell, Volunteer/Sarga, Member/Paradox, Faculty. */
  demo: { email: "23s1000123@ds.study.iitm.ac.in", password: "sangam" },
  /** Alok Kumar Tripathi: Faculty, no club membership. */
  faculty: { email: "23f3003225@ds.study.iitm.ac.in", password: "Alok@2026" },
  /** Vishal Singh Baraiya: Admin of CodeChef (c1) only. */
  admin: { email: "23f2005593@ds.study.iitm.ac.in", password: "Vishal@2026" },
  /** Pardhiv Nukasani: Volunteer of Sarga (c3) only. */
  volunteer: { email: "23f3004115@ds.study.iitm.ac.in", password: "Pardhiv@2026" },
  /** Purnendu Shukla: Coordinator of E-Cell (c6) only. */
  coordinator: { email: "22f2000147@ds.study.iitm.ac.in", password: "Purnendu@2026" },
  /** Yalla Ashish Chandra Reddy: Member of Paradox (c2) only. */
  member: { email: "23f3003728@ds.study.iitm.ac.in", password: "Ashish@2026" },
} as const;

export const CLUB_IDS = {
  codechef: "c1",
  paradox: "c2",
  sarga: "c3",
  kalakriti: "c4",
  prakriti: "c5",
  eCell: "c6",
  quill: "c7",
  arena: "c8",
} as const;

type JsonValue = Record<string, unknown> | unknown[];

type RequestOptions = {
  json?: JsonValue;
  rawBody?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
};

export type ApiResponse<T = any> = {
  status: number;
  body: T;
  headers: Headers;
};

/**
 * Minimal cookie-jar HTTP client. Node's fetch does not persist cookies
 * across requests the way a browser or Python's httpx.Client does, so this
 * captures Set-Cookie on every response and replays it on the next request,
 * exactly like a real signed-in browser session would.
 */
export class ApiClient {
  private cookieJar = new Map<string, string>();

  constructor(private readonly baseUrl: string = BASE_URL) {}

  private cookieHeader(): string | undefined {
    if (this.cookieJar.size === 0) return undefined;
    return [...this.cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private storeCookies(res: Response) {
    const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const raw of setCookies) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      this.cookieJar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  clearCookies(): void {
    this.cookieJar.clear();
  }

  getCookie(name: string): string | undefined {
    return this.cookieJar.get(name);
  }

  /** Sets a cookie directly, e.g. to simulate a forged or tampered session value. */
  setCookie(name: string, value: string): void {
    this.cookieJar.set(name, value);
  }

  async request<T = any>(method: string, path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = new URL(path, this.baseUrl);
    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = { ...options.headers };
    const cookieHeader = this.cookieHeader();
    if (cookieHeader) headers.Cookie = cookieHeader;

    let body: string | undefined;
    if (options.rawBody !== undefined) {
      body = options.rawBody;
      headers["Content-Type"] ??= "application/json";
    } else if (options.json !== undefined) {
      body = JSON.stringify(options.json);
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, { method, headers, body, redirect: "manual" });
    this.storeCookies(res);

    let parsedBody: T = null as T;
    try {
      parsedBody = (await res.json()) as T;
    } catch {
      // Non-JSON or empty body (e.g. redirects) — leave as null.
    }

    return { status: res.status, body: parsedBody, headers: res.headers };
  }

  get<T = any>(path: string, params?: Record<string, string>) {
    return this.request<T>("GET", path, { params });
  }

  post<T = any>(path: string, json?: JsonValue) {
    return this.request<T>("POST", path, { json });
  }

  patch<T = any>(path: string, json?: JsonValue) {
    return this.request<T>("PATCH", path, { json });
  }

  postRaw<T = any>(path: string, rawBody: string) {
    return this.request<T>("POST", path, { rawBody });
  }
}

/** True once the app responds to any request, including a client error. */
export async function isApiAvailable(baseUrl: string = BASE_URL): Promise<boolean> {
  try {
    const res = await fetch(new URL("/api/auth/session", baseUrl), { signal: AbortSignal.timeout(3000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

export function requireApiAvailable(available: boolean): void {
  if (!available) {
    throw new Error(
      `Sangam API is not reachable at ${BASE_URL}. Start Postgres (npm run db:up), push+seed ` +
        "(npm run db:push && npm run db:seed), then the app (npm run dev), and re-run npm run test:integration.",
    );
  }
}

/** Course-required test-case report format, printed for every case regardless of pass/fail. */
export function printCase(title: string, inputs: unknown, expected: unknown, actual: unknown, result: "Success" | "Fail"): void {
  console.log(
    `\nAPI being tested: ${title}\n` +
      `Inputs:\n${JSON.stringify(inputs, null, 2)}\n` +
      `Expected output:\n${JSON.stringify(expected, null, 2)}\n` +
      `Actual Output:\n${JSON.stringify(actual, null, 2)}\n` +
      `Result: ${result}\n`,
  );
}

/** Runs assertions, printing the course-required case report, then re-throwing on failure. */
export function reportCase(title: string, inputs: unknown, expected: unknown, actual: unknown, assertions: () => void): void {
  try {
    assertions();
    printCase(title, inputs, expected, actual, "Success");
  } catch (error) {
    printCase(title, inputs, expected, actual, "Fail");
    throw error;
  }
}

export function uniqueIdentity(prefix = "23t"): { name: string; email: string; rollNumber: string; password: string } {
  const suffix = Math.random().toString(36).slice(2, 10);
  const roll = `${prefix}${suffix}`;
  return {
    name: "Jest Integration User",
    email: `${roll}@${INSTITUTIONAL_DOMAIN}`,
    rollNumber: roll,
    password: "SecurePass1",
  };
}

export async function signup(client: ApiClient, identity: { name: string; email: string; rollNumber: string; password: string }) {
  const res = await client.post(SIGNUP_PATH, identity);
  if (res.status !== 201) throw new Error(`Signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res;
}

export async function login(client: ApiClient, email: string, password: string) {
  const res = await client.post(LOGIN_PATH, { email, password });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res;
}

export async function signupAndLogin(client: ApiClient, identity: { name: string; email: string; rollNumber: string; password: string }) {
  await signup(client, identity);
  client.clearCookies();
  await login(client, identity.email, identity.password);
}
