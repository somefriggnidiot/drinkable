import { describe, it, expect } from "vitest";
import {
  brewerySchema,
  reviewSchema,
  publicUrl,
  mediaUrl,
} from "../../src/domain/validation";
import { blankProfile } from "../../src/domain/defaults";
describe("untrusted input", () => {
  it("rejects executable URLs and remote image attachments", () => {
    expect(publicUrl.safeParse("javascript:alert(1)").success).toBe(false);
    expect(mediaUrl.safeParse("https://example.com/tracker.jpg").success).toBe(
      false,
    );
    expect(mediaUrl.safeParse("/media/../../secrets").success).toBe(false);
  });
  it("rejects invalid time zones and unbounded coordinates", () => {
    const profile = {
      ...blankProfile(),
      address: "123 Main",
      city: "KC",
      region: "MO",
      latitude: 100,
    };
    expect(
      brewerySchema.safeParse({ name: "A brewery", slug: "a-brewery", profile })
        .success,
    ).toBe(false);
    profile.latitude = 39;
    profile.timezone = "not-a-zone";
    expect(
      brewerySchema.safeParse({ name: "A brewery", slug: "a-brewery", profile })
        .success,
    ).toBe(false);
  });
  it("requires all six rating dimensions on a half-star scale", () => {
    const ratings = {
      overall: 4.5,
      quality: 4,
      variety: 4,
      price: 4,
      service: 5,
      atmosphere: 4,
    };
    expect(
      reviewSchema.safeParse({
        ratings,
        message: "A helpful review about a visit.",
        photos: [],
      }).success,
    ).toBe(true);
    expect(
      reviewSchema.safeParse({
        ratings: { ...ratings, overall: 4.3 },
        message: "A helpful review about a visit.",
        photos: [],
      }).success,
    ).toBe(false);
  });
});
