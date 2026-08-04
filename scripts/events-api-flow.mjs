/**
 * End-to-end Events API flow across roles.
 * Run: node scripts/events-api-flow.mjs  (from repo root, with npm run dev up)
 */
import { PrismaClient } from "@prisma/client";

const BASE = (process.env.SANGAM_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const prisma = new PrismaClient();

const ACCOUNTS = {
  admin: { email: "23f2005593@ds.study.iitm.ac.in", password: "Vishal@2026", label: "Vishal (Admin/c1)" },
  coordinator: { email: "22f2000147@ds.study.iitm.ac.in", password: "Purnendu@2026", label: "Purnendu (Coordinator/c6)" },
  faculty: { email: "23f3003225@ds.study.iitm.ac.in", password: "Alok@2026", label: "Alok (Faculty)" },
  member: { email: "23f3003728@ds.study.iitm.ac.in", password: "Ashish@2026", label: "Ashish (Member/c2)" },
};

class Client {
  constructor() {
    this.cookies = new Map();
  }
  cookieHeader() {
    if (!this.cookies.size) return undefined;
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  store(res) {
    const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const raw of list) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
  clear() {
    this.cookies.clear();
  }
  async req(method, path, json) {
    const headers = { Accept: "application/json" };
    const cookie = this.cookieHeader();
    if (cookie) headers.Cookie = cookie;
    let body;
    if (json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(json);
    }
    const res = await fetch(`${BASE}${path}`, { method, headers, body, redirect: "manual" });
    this.store(res);
    let parsed = null;
    try {
      parsed = await res.json();
    } catch {
      /* empty */
    }
    return { status: res.status, body: parsed };
  }
  get(path) {
    return this.req("GET", path);
  }
  post(path, json) {
    return this.req("POST", path, json);
  }
  patch(path, json) {
    return this.req("PATCH", path, json);
  }
}

const results = [];

function logStep(name, ok, detail) {
  const row = { name, ok, detail };
  results.push(row);
  console.log(`\n${ok ? "PASS" : "FAIL"}  ${name}`);
  if (detail) console.log(typeof detail === "string" ? detail : JSON.stringify(detail, null, 2));
}

async function login(client, account) {
  client.clear();
  const res = await client.post("/api/auth/login", { email: account.email, password: account.password });
  if (res.status !== 200) throw new Error(`Login failed for ${account.label}: ${res.status} ${JSON.stringify(res.body)}`);
  return res;
}

async function diagnoseBrokenEvent() {
  const id = "cmscvm90h0009134s1w5utx07";
  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { countMeIns: true } } },
  });
  console.log("\n=== Diagnosis: prior failed register event ===");
  if (!event) {
    console.log("Event not found in DB (may have been deleted).");
    return;
  }
  const now = Date.now();
  const eventMs = new Date(event.date).getTime();
  console.log(
    JSON.stringify(
      {
        id: event.id,
        title: event.title,
        clubId: event.clubId,
        date: event.date,
        status: event.status,
        capacity: event.capacity,
        countMeIns: event._count.countMeIns,
        registrationLocked: event.registrationLocked,
        approval: event.approval,
        isPastByDate: eventMs < now,
        now: new Date(now).toISOString(),
      },
      null,
      2,
    ),
  );
  if (eventMs < now) {
    console.log("ROOT CAUSE: event date is before now → decideCountMeInAction throws → REGISTRATION_UNAVAILABLE");
  } else if (event._count.countMeIns >= event.capacity) {
    console.log("ROOT CAUSE: at capacity");
  } else if (event.registrationLocked) {
    console.log("Would be REGISTRATION_LOCKED, not UNAVAILABLE");
  }
}

async function main() {
  // Reachability
  try {
    const ping = await fetch(`${BASE}/api/auth/session`, { signal: AbortSignal.timeout(3000) });
    if (ping.status >= 500) throw new Error(`API unhealthy: ${ping.status}`);
  } catch (e) {
    console.error(`API not reachable at ${BASE}. Start npm run dev first.`);
    throw e;
  }

  await diagnoseBrokenEvent();

  const admin = new Client();
  const coordinator = new Client();
  const faculty = new Client();
  const member = new Client();

  await login(admin, ACCOUNTS.admin);
  await login(coordinator, ACCOUNTS.coordinator);
  await login(faculty, ACCOUNTS.faculty);
  await login(member, ACCOUNTS.member);
  logStep("Auth: login Admin / Coordinator / Faculty / Member", true, "all 200");

  // Future date so registration is available
  const futureDate = new Date();
  futureDate.setUTCDate(futureDate.getUTCDate() + 14);
  const dateStr = futureDate.toISOString().slice(0, 10);

  // 1) GET /api/events (any auth)
  {
    const res = await member.get("/api/events?clubId=c1");
    logStep("GET /api/events?clubId=c1", res.status === 200 && res.body?.success === true, {
      status: res.status,
      count: res.body?.data?.events?.length,
    });
  }

  // 2) GET /api/events/conflicts
  {
    const res = await admin.get(`/api/events/conflicts?date=${dateStr}&venue=Test+Hall`);
    logStep("GET /api/events/conflicts", res.status === 200 && res.body?.success === true, {
      status: res.status,
      body: res.body,
    });
  }

  // 3) POST /api/events — Admin of c1
  let eventId;
  {
    const payload = {
      clubId: "c1",
      title: `API Flow Test ${Date.now()}`,
      description: "Full events API flow verification",
      date: dateStr,
      time: "18:00",
      venue: "Online · Discord",
      capacity: 25,
      tags: "workshop,api-test",
    };
    const res = await admin.post("/api/events", payload);
    eventId = res.body?.data?.event?.id;
    logStep("POST /api/events (Admin/c1)", res.status === 201 && Boolean(eventId), {
      status: res.status,
      eventId,
      approval: res.body?.data?.event?.approval,
      statusField: res.body?.data?.event?.status,
      error: res.body?.error,
    });
    if (!eventId) throw new Error("Cannot continue without eventId");
  }

  // 4) GET /api/events/{id}
  {
    const res = await member.get(`/api/events/${eventId}`);
    logStep("GET /api/events/{id}", res.status === 200 && res.body?.data?.event?.id === eventId, {
      status: res.status,
      title: res.body?.data?.event?.title,
    });
  }

  // 5) PATCH /api/events/{id} — Admin edits
  {
    const res = await admin.patch(`/api/events/${eventId}`, {
      title: "API Flow Test (edited)",
      description: "Updated description",
      capacity: 30,
    });
    logStep("PATCH /api/events/{id} (Admin)", res.status === 200 && res.body?.data?.event?.title?.includes("edited"), {
      status: res.status,
      title: res.body?.data?.event?.title,
      capacity: res.body?.data?.event?.capacity,
      error: res.body?.error,
    });
  }

  // 6) POST /api/events/{id}/approve — Faculty
  {
    const res = await faculty.post(`/api/events/${eventId}/approve`, { approval: "approved" });
    logStep("POST /api/events/{id}/approve (Faculty)", res.status === 200 && res.body?.data?.event?.approval === "approved", {
      status: res.status,
      approval: res.body?.data?.event?.approval,
      error: res.body?.error,
    });
  }

  // 7) POST /api/events/{id}/register — Member (Ashish)
  {
    const res = await member.post(`/api/events/${eventId}/register`);
    logStep("POST /api/events/{id}/register (Member)", res.status === 200 && res.body?.data?.action === "registered", {
      status: res.status,
      action: res.body?.data?.action,
      error: res.body?.error,
    });
  }

  // 8) GET /api/events/{id}/participants — Admin
  let countMeInId;
  {
    const res = await admin.get(`/api/events/${eventId}/participants`);
    const participants = res.body?.data?.participants ?? [];
    countMeInId = participants[0]?.id;
    logStep(
      "GET /api/events/{id}/participants (Admin)",
      res.status === 200 && participants.length >= 1 && Boolean(countMeInId),
      {
        status: res.status,
        participants,
        error: res.body?.error,
      },
    );
  }

  // 9) POST /api/events/{id}/checkin — Admin
  {
    const res = await admin.post(`/api/events/${eventId}/checkin`, { countMeInId });
    logStep(
      "POST /api/events/{id}/checkin (Admin)",
      res.status === 200 && res.body?.data?.countMeIn?.checkedIn === true,
      {
        status: res.status,
        countMeIn: res.body?.data?.countMeIn,
        error: res.body?.error,
      },
    );
  }

  // 10) PATCH /api/events/{id}/lock — Admin locks
  {
    const res = await admin.patch(`/api/events/${eventId}/lock`, { locked: true });
    logStep("PATCH /api/events/{id}/lock locked=true (Admin)", res.status === 200 && res.body?.data?.event?.registrationLocked === true, {
      status: res.status,
      registrationLocked: res.body?.data?.event?.registrationLocked,
      error: res.body?.error,
    });
  }

  // 11) Register while locked — expect 409
  {
    // signup a fresh user so we aren't toggling cancel on Ashish
    const suffix = Math.random().toString(36).slice(2, 10);
    const identity = {
      name: "Flow Extra User",
      email: `23t${suffix}@ds.study.iitm.ac.in`,
      rollNumber: `23t${suffix}`,
      password: "SecurePass1",
    };
    const extra = new Client();
    const signup = await extra.post("/api/auth/signup", identity);
    await login(extra, identity);
    const res = await extra.post(`/api/events/${eventId}/register`);
    logStep("POST /api/events/{id}/register while locked → 409", res.status === 409 && res.body?.error?.code === "REGISTRATION_LOCKED", {
      status: res.status,
      error: res.body?.error,
      signupStatus: signup.status,
    });
    // cleanup user if created
    try {
      await prisma.countMeIn.deleteMany({ where: { user: { email: identity.email } } });
      await prisma.user.deleteMany({ where: { email: identity.email } });
    } catch {
      /* ignore */
    }
  }

  // 12) Unlock
  {
    const res = await admin.patch(`/api/events/${eventId}/lock`, { locked: false });
    logStep("PATCH /api/events/{id}/lock locked=false (Admin)", res.status === 200 && res.body?.data?.event?.registrationLocked === false, {
      status: res.status,
      registrationLocked: res.body?.data?.event?.registrationLocked,
    });
  }

  // Negative: Coordinator of c6 cannot create for c1
  {
    const res = await coordinator.post("/api/events", {
      clubId: "c1",
      title: "Should Fail",
      description: "x",
      date: dateStr,
      time: "10:00",
      venue: "x",
      capacity: 5,
    });
    logStep("POST /api/events Coordinator/c6 on club c1 → 403", res.status === 403, {
      status: res.status,
      error: res.body?.error,
    });
  }

  // Coordinator creates for own club c6
  {
    const res = await coordinator.post("/api/events", {
      clubId: "c6",
      title: `Coordinator Event ${Date.now()}`,
      description: "E-Cell event via coordinator",
      date: dateStr,
      time: "11:00",
      venue: "Seminar Hall",
      capacity: 40,
    });
    logStep("POST /api/events (Coordinator/c6)", res.status === 201 && Boolean(res.body?.data?.event?.id), {
      status: res.status,
      eventId: res.body?.data?.event?.id,
      error: res.body?.error,
    });
  }

  console.log("\n========== SUMMARY ==========");
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.name}`);
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  console.log(`Primary flow eventId: ${eventId}`);
  console.log(`countMeInId used for checkin: ${countMeInId}`);

  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
