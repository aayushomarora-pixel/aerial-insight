import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  listAnalysesByUser: vi.fn(),
  getAnalysisById: vi.fn(),
  createAnalysis: vi.fn(),
}));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const baseContext = {
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

const validInput = {
  fileName: "site.png",
  mimeType: "image/png" as const,
  imageData: "data:image/png;base64,aGVsbG8=",
  prompt: "Count buildings and assess visible flooding.",
};

describe("analysis.create", () => {
  it("requires a signed-in user", async () => {
    const caller = appRouter.createCaller({ ...baseContext, user: undefined });
    await expect(caller.analysis.create(validInput)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an underspecified investigation prompt", async () => {
    const caller = appRouter.createCaller({
      ...baseContext,
      user: {
        id: 7,
        openId: "analysis-test-user",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "test",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });
    await expect(caller.analysis.create({ ...validInput, prompt: "map" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("analysis history", () => {
  it("lists reports for the signed-in user", async () => {
    const db = await import("./db");
    vi.mocked(db.listAnalysesByUser).mockResolvedValueOnce([]);
    const caller = appRouter.createCaller({
      ...baseContext,
      user: { id: 12, openId: "history-user", name: "History User", email: "history@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    });
    await caller.analysis.list();
    expect(db.listAnalysesByUser).toHaveBeenCalledWith(12);
  });

  it("requests a saved report with the current user's scope", async () => {
    const db = await import("./db");
    vi.mocked(db.getAnalysisById).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller({
      ...baseContext,
      user: { id: 19, openId: "scope-user", name: "Scope User", email: "scope@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    });
    await caller.analysis.get({ id: 44 });
    expect(db.getAnalysisById).toHaveBeenCalledWith(44, 19);
  });
});

describe("report parsing", () => {
  it("accepts the explicit remote-sensing report shape", async () => {
    const { parseReport } = await import("./routers");
    const report = parseReport(JSON.stringify({ title: "Field scan", summary: "Visible evidence is limited.", originalPrompt: "Count buildings.", buildingCount: 4, floodingIndicators: "No clear standing water.", affectedAreaEstimate: "Not measurable without scale.", cropHealthObservations: "Mixed vigor across plots.", overallConfidence: 71, findings: [], keyObservations: ["Four roof-like structures are visible."], limitations: ["No georeferencing metadata was provided."] }));
    expect(report.buildingCount).toBe(4);
    expect(report.originalPrompt).toBe("Count buildings.");
  });

  it("rejects reports missing explicit metrics", async () => {
    const { parseReport } = await import("./routers");
    expect(() => parseReport(JSON.stringify({ title: "Incomplete", summary: "Missing fields." }))).toThrow();
  });
});
