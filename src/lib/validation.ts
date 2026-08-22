import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * First error per field, keyed by field name. Reads `issues` directly rather
 * than `.flatten()` so this survives Zod major versions.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export const propertySchema = z.object({
  addressLine1: z.string().trim().min(3, "Enter the street address"),
  addressLine2: z.string().trim(),
  city: z.string().trim().min(1, "Enter the city"),
  stateProvince: z.string().trim(),
  postalCode: z.string().trim(),
  landlordName: z.string().trim(),
  landlordEmail: z.union([z.literal(""), z.email("Enter a valid email address")]),
});
