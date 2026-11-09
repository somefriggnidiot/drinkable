import { describe, it, expect } from "vitest";
import { openingStatus } from "../../src/domain/hours";
import { blankProfile } from "../../src/domain/defaults";
describe("local opening hours", () => {
  it("keeps missing hours unknown", () =>
    expect(openingStatus(blankProfile()).state).toBe("unknown"));
  it("handles an overnight interval on the following day", () => {
    const profile = {
      ...blankProfile(),
      hours: { "0": [], "6": [{ open: "22:00", close: "02:00" }] },
    };
    expect(openingStatus(profile, new Date("2026-11-08T07:30:00Z")).state).toBe(
      "open",
    );
    expect(openingStatus(profile, new Date("2026-11-08T08:00:00Z")).state).toBe(
      "closed",
    );
  });
  it("makes an exception override carry-over from yesterday", () => {
    const profile = {
      ...blankProfile(),
      hours: { "6": [{ open: "22:00", close: "02:00" }] },
      exceptions: { "2026-11-08": [] },
    };
    expect(openingStatus(profile, new Date("2026-11-08T07:30:00Z")).state).toBe(
      "closed",
    );
  });
  it("evaluates both occurrences of a repeated daylight-saving hour", () => {
    const profile = {
      ...blankProfile(),
      hours: { "0": [{ open: "01:00", close: "02:00" }] },
    };
    for (const now of ["2026-11-01T06:30:00Z", "2026-11-01T07:30:00Z"])
      expect(openingStatus(profile, new Date(now)).state).toBe("open");
  });
  it("uses the brewery time zone instead of the server time zone", () => {
    const profile = {
      ...blankProfile(),
      timezone: "America/Los_Angeles",
      hours: { "0": [{ open: "20:00", close: "22:00" }] },
    };
    expect(openingStatus(profile, new Date("2026-11-09T05:00:00Z")).state).toBe(
      "open",
    );
  });
  it("can open a special date without a weekly schedule", () => {
    const profile = {
      ...blankProfile(),
      exceptions: { "2026-11-08": [{ open: "12:00", close: "16:00" }] },
    };
    expect(openingStatus(profile, new Date("2026-11-08T20:00:00Z")).state).toBe(
      "open",
    );
  });
});

it("keeps an unspecified day unknown when other weekly hours exist", () => {
  const profile = {
    ...blankProfile(),
    hours: { "1": [{ open: "12:00", close: "20:00" }] },
  };
  expect(openingStatus(profile, new Date("2026-11-08T18:00:00Z")).state).toBe(
    "unknown",
  );
});
it("includes overnight carry-over in today’s displayed hours", () => {
  const profile = {
    ...blankProfile(),
    hours: { "0": [], "6": [{ open: "22:00", close: "02:00" }] },
  };
  expect(
    openingStatus(profile, new Date("2026-11-08T07:30:00Z")).today,
  ).toEqual([{ open: "00:00", close: "02:00" }]);
});
