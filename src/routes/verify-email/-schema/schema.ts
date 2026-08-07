import * as z from "zod";

export const verifyEmailSchema = z.object({
  email: z.email(),
  otp: z.string().length(6),
});
