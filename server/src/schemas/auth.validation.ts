import z from "zod";

export const discordCallbackSchema = z.object({
  query: z.object({
    code: z.string().min(1, "Authorization code is required"),
    state: z.string().optional(),
  }),
});
