import { z } from "zod";

/** Only institutional emails are accepted for account creation (User Story 1.1). */
export const INSTITUTIONAL_EMAIL_DOMAIN = "ds.study.iitm.ac.in";

export const institutionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .refine((email) => email.endsWith(`@${INSTITUTIONAL_EMAIL_DOMAIN}`), {
    message: `Email must end with @${INSTITUTIONAL_EMAIL_DOMAIN}`,
  });

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: institutionalEmailSchema,
  rollNumber: z.string().trim().min(1, "Roll number is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;
