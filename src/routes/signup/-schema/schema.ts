import * as z from "zod";

export const signupSchema = z.object({
  email: z.email(),
  password: z.string(),
});
