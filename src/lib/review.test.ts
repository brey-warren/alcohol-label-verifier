import { describe, expect, it } from "vitest";
import type { ApplicationData } from "../types";
import {
  cloneApplication,
  countConfirmedReviewItems,
  createWarningReview,
  isApplicationComplete,
} from "./review";

const completeApplication: ApplicationData = {
  brandName: "Old Tom Distillery",
  classType: "Kentucky Straight Bourbon Whiskey",
  abv: "45",
  netContents: "750 mL",
  producer: "Old Tom Distillery, Louisville, Kentucky",
  imported: false,
  countryOfOrigin: "",
};

describe("application records", () => {
  it("creates independent copies for separate batch files", () => {
    const first = cloneApplication(completeApplication);
    const second = cloneApplication(completeApplication);

    first.brandName = "River Glen";

    expect(second.brandName).toBe("Old Tom Distillery");
    expect(completeApplication.brandName).toBe("Old Tom Distillery");
  });

  it("requires country of origin only when the record is imported", () => {
    expect(isApplicationComplete(completeApplication)).toBe(true);
    expect(isApplicationComplete({ ...completeApplication, imported: true })).toBe(false);
    expect(
      isApplicationComplete({
        ...completeApplication,
        imported: true,
        countryOfOrigin: "France",
      }),
    ).toBe(true);
  });
});

describe("warning visual review", () => {
  it("creates a fresh unchecked checklist for each label", () => {
    const first = createWarningReview();
    const second = createWarningReview();

    first.boldHeading = true;

    expect(second.boldHeading).toBe(false);
    expect(countConfirmedReviewItems(first)).toBe(1);
  });
});
