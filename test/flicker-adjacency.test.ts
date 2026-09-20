/**
 * harness: npm run visual:flicker / tools/flicker/judge.ts.
 * Bounds: synthetic hard-detail collapse, fixed pixels at gaps 1, 2, 15, 22, 100;
 * gap metadata must never dilute a pixel defect or certify missing frames.
 */
import { describe, expect, it } from "vitest";
import { judgeFlicker } from "../tools/flicker/judge.js";
import { crawlingRecord, movingRecord } from "./flicker-frames.js";

describe("adjacent-frame flicker contract", () => {
  for (const gap of [1, 2, 15, 22, 100]) {
    it(`does not dilute collapsed detail at frame gap ${gap}`, () => {
      const record = crawlingRecord(8).map((frame, index) => ({ ...frame,
        frameCountMid: 100 + index * gap,
        shutterOpenedAtFrame: 100 + index * gap,
        shutterClosedAtFrame: 100 + index * gap,
      }));
      expect(judgeFlicker(record).failures.some((failure) => failure.includes("the crawl indicator reads"))).toBe(true);
    });
  }
  it("refuses missing rendered frames even when the pixels are a pure translation", () => {
    const record = movingRecord(8).map((frame, index) => ({ ...frame,
      frameCountMid: 100 + index * 22,
      shutterOpenedAtFrame: 100 + index * 22,
      shutterClosedAtFrame: 100 + index * 22,
    }));
    expect(judgeFlicker(record).failures.some((failure) => failure.includes("not adjacent"))).toBe(true);
  });
  it("refuses a shutter that cannot bind pixels to exactly one rendered frame", () => {
    const record = movingRecord(8).map((frame, index) => ({ ...frame,
      frameCountMid: 100 + index,
      shutterOpenedAtFrame: 100 + index,
      shutterClosedAtFrame: 101 + index,
    }));
    expect(judgeFlicker(record).failures.some((failure) => failure.includes("not bound to one rendered frame"))).toBe(true);
  });
});
