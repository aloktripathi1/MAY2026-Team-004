import { redirect } from "next/navigation";
import { getAppSession } from "../../../../backend/auth/app-session";
import {
  requirePageMembership,
  requirePageSession,
} from "../../../../backend/auth/page-session";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

jest.mock("../../../../backend/auth/app-session", () => ({
  getAppSession: jest.fn(),
}));

const mockGetSession = jest.mocked(getAppSession);
const mockRedirect = jest.mocked(redirect);

beforeEach(() => {
  jest.clearAllMocks();
});

it("redirects an anonymous page request before the page can dereference the session", async () => {
  mockGetSession.mockResolvedValue(null);

  await expect(requirePageSession()).rejects.toThrow("NEXT_REDIRECT");
  expect(mockRedirect).toHaveBeenCalledWith("/login");
});

it("returns an authenticated page session", async () => {
  const session = {
    user: {
      id: "u1",
      name: "Test User",
      email: "test@ds.study.iitm.ac.in",
      isFaculty: false,
      memberships: [],
    },
    expires: "2099-12-31T23:59:59.999Z",
  };
  mockGetSession.mockResolvedValue(session);

  await expect(requirePageSession()).resolves.toBe(session);
  expect(mockRedirect).not.toHaveBeenCalled();
});
it("redirects an authenticated user who lacks the page role", async () => {
  mockGetSession.mockResolvedValue({
    user: {
      id: "u1",
      name: "Test User",
      email: "test@ds.study.iitm.ac.in",
      isFaculty: false,
      memberships: [],
    },
    expires: "2099-12-31T23:59:59.999Z",
  });

  await expect(requirePageMembership("Admin")).rejects.toThrow("NEXT_REDIRECT");
  expect(mockRedirect).toHaveBeenCalledWith("/app");
});

it("returns the requested role membership", async () => {
  const membership = {
    clubId: "c1",
    clubSlug: "codechef",
    clubName: "CodeChef IITM BS",
    role: "Admin",
    personaName: "Test Admin",
  };
  mockGetSession.mockResolvedValue({
    user: {
      id: "u1",
      name: "Test User",
      email: "test@ds.study.iitm.ac.in",
      isFaculty: false,
      memberships: [membership],
    },
    expires: "2099-12-31T23:59:59.999Z",
  });

  await expect(requirePageMembership("Admin")).resolves.toMatchObject({
    membership,
  });
  expect(mockRedirect).not.toHaveBeenCalled();
});
