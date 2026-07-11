import { cookies } from "next/headers";

export const AUTH_USER_ID_COOKIE = "sangam_user_id";
export const AUTH_USER_NAME_COOKIE = "sangam_user_name";
export const AUTH_USER_EMAIL_COOKIE = "sangam_user_email";
export const AUTH_USER_FACULTY_COOKIE = "sangam_user_faculty";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export type AuthCookieUser = {
  id: string;
  name: string;
  email: string;
  isFaculty?: boolean;
};

export function setAuthCookies(user: AuthCookieUser) {
  const store = cookies();
  store.set(AUTH_USER_ID_COOKIE, user.id, cookieOptions);
  store.set(AUTH_USER_NAME_COOKIE, user.name, cookieOptions);
  store.set(AUTH_USER_EMAIL_COOKIE, user.email, cookieOptions);
  store.set(AUTH_USER_FACULTY_COOKIE, user.isFaculty ? "1" : "0", cookieOptions);
}

export function clearAuthCookies() {
  const store = cookies();
  store.delete(AUTH_USER_ID_COOKIE);
  store.delete(AUTH_USER_NAME_COOKIE);
  store.delete(AUTH_USER_EMAIL_COOKIE);
  store.delete(AUTH_USER_FACULTY_COOKIE);
}

export function getAuthCookieUser(): AuthCookieUser | null {
  const store = cookies();
  const id = store.get(AUTH_USER_ID_COOKIE)?.value;
  const name = store.get(AUTH_USER_NAME_COOKIE)?.value;
  const email = store.get(AUTH_USER_EMAIL_COOKIE)?.value;

  if (!id || !name || !email) return null;

  return {
    id,
    name,
    email,
    isFaculty: store.get(AUTH_USER_FACULTY_COOKIE)?.value === "1",
  };
}
