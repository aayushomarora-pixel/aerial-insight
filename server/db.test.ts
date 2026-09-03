import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  drizzle: vi.fn(),
  rows: [] as Array<Record<string, unknown>>,
}));

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: mocks.drizzle }));

import { createAnalysis, getAnalysisById, listAnalysesByUser } from "./db";

function installFakeDb() {
  const fakeDb = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => mocks.rows),
          orderBy: vi.fn(async () => mocks.rows),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async () => [{ insertId: 31 }]),
    })),
  };
  mocks.drizzle.mockReturnValue(fakeDb);
  process.env.DATABASE_URL = "mysql://unit-test";
}

describe("analysis persistence helpers", () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.drizzle.mockReset();
    installFakeDb();
  });

  it("lists reports for one user", async () => {
    const row = { id: 1, userId: 8, fileName: "field.png" };
    mocks.rows = [row];
    await expect(listAnalysesByUser(8)).resolves.toEqual([row]);
  });

  it("does not return a report to a different user", async () => {
    mocks.rows = [{ id: 7, userId: 8, fileName: "private.png" }];
    await expect(getAnalysisById(7, 99)).resolves.toBeUndefined();
  });

  it("creates a report and reloads it by the owning user", async () => {
    const row = { id: 31, userId: 8, fileName: "new.png" };
    mocks.rows = [row];
    const saved = await createAnalysis({ userId: 8, imageKey: "8/analyses/new.png", imageUrl: "/manus-storage/new.png", fileName: "new.png", prompt: "Count buildings in this scene.", reportJson: "{}" });
    expect(saved).toEqual(row);
  });
});
