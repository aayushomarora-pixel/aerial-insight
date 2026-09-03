import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createAnalysis, getAnalysisById, listAnalysesByUser } from "./db";
import { storagePut } from "./storage";

const reportSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    originalPrompt: { type: "string" },
    buildingCount: { type: ["integer", "null"] },
    floodingIndicators: { type: "string" },
    affectedAreaEstimate: { type: "string" },
    cropHealthObservations: { type: "string" },
    overallConfidence: { type: "integer", minimum: 0, maximum: 100 },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          label: { type: "string" },
          estimate: { type: "string" },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
          observation: { type: "string" },
        },
        required: ["category", "label", "estimate", "confidence", "observation"],
        additionalProperties: false,
      },
    },
    keyObservations: { type: "array", items: { type: "string" } },
    limitations: { type: "array", items: { type: "string" } },
  },
  required: ["title", "summary", "originalPrompt", "buildingCount", "floodingIndicators", "affectedAreaEstimate", "cropHealthObservations", "overallConfidence", "findings", "keyObservations", "limitations"],
  additionalProperties: false,
} as const;

const reportValidator = z.object({
  title: z.string(),
  summary: z.string(),
  originalPrompt: z.string(),
  buildingCount: z.number().int().nullable(),
  floodingIndicators: z.string(),
  affectedAreaEstimate: z.string(),
  cropHealthObservations: z.string(),
  overallConfidence: z.number().int().min(0).max(100),
  findings: z.array(z.object({ category: z.string(), label: z.string(), estimate: z.string(), confidence: z.number().int().min(0).max(100), observation: z.string() })),
  keyObservations: z.array(z.string()),
  limitations: z.array(z.string()),
});

const createInput = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  imageData: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/).max(14_000_000),
  prompt: z.string().min(12).max(4000),
});

export function parseReport(content: string | Array<unknown>) {
  if (typeof content !== "string") throw new Error("The vision model returned an unreadable report");
  return reportValidator.parse(JSON.parse(content));
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  analysis: router({
    list: protectedProcedure.query(({ ctx }) => listAnalysesByUser(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) =>
      getAnalysisById(input.id, ctx.user.id),
    ),
    create: protectedProcedure.input(createInput).mutation(async ({ ctx, input }) => {
      const [, base64] = input.imageData.split(",");
      if (!base64) throw new Error("Invalid image payload");

      const imageBuffer = Buffer.from(base64, "base64");
      if (imageBuffer.length > 10 * 1024 * 1024) throw new Error("Image must be 10 MB or smaller");
      const storage = await storagePut(`${ctx.user.id}/analyses/${input.fileName}`, imageBuffer, input.mimeType);

      const response = await invokeLLM({
        model: "gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a careful remote-sensing analyst. Inspect the supplied satellite or aerial image and return only the requested JSON report. Always populate buildingCount (use null if not visible or not requested), floodingIndicators, affectedAreaEstimate, and cropHealthObservations. Distinguish visible evidence from inference. Do not invent precise counts when resolution, occlusion, or image quality prevents them. For affected area, report an estimate only when a scale, georeferencing, or a defensible visual approximation exists; otherwise say not measurable. Always include limitations and copy the analysis request into originalPrompt.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Analysis request: ${input.prompt}` },
              { type: "image_url", image_url: { url: input.imageData, detail: "high" } },
            ],
          },
        ],
        maxTokens: 5000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "aerial_analysis_report",
            strict: true,
            schema: reportSchema,
          },
        },
      });

      const report = parseReport(response.choices[0]?.message?.content ?? "");
      report.originalPrompt = input.prompt;
      const saved = await createAnalysis({
        userId: ctx.user.id,
        imageKey: storage.key,
        imageUrl: storage.url,
        fileName: input.fileName,
        prompt: input.prompt,
        reportJson: JSON.stringify(report),
      });

      return { ...saved, report };
    }),
  }),
});

export type AppRouter = typeof appRouter;
