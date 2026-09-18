import { describe, expect, it } from "vitest";
import type { ApplicationData } from "../types";
import { GOVERNMENT_WARNING, verifyLabel } from "./verification";

const application: ApplicationData = {
  brandName: "Stone's Throw",
  classType: "Kentucky Straight Bourbon Whiskey",
  abv: "45",
  netContents: "750 mL",
  producer: "Old Tom Distillery, Louisville, Kentucky",
  imported: false,
  countryOfOrigin: "",
};

const validLabel = `
STONE'S THROW
Kentucky Straight Bourbon Whiskey
45% Alc. by Vol. (90 Proof)
750 mL
Old Tom Distillery, Louisville, Kentucky
${GOVERNMENT_WARNING}
`;

describe("verifyLabel", () => {
  it("treats capitalization-only brand differences as a match", () => {
    const report = verifyLabel(application, validLabel);
    expect(report.checks.find((check) => check.id === "brand")?.status).toBe("pass");
  });

  it("detects an ABV mismatch", () => {
    const report = verifyLabel(application, validLabel.replace("45%", "40%"));
    expect(report.checks.find((check) => check.id === "abv")?.status).toBe("fail");
  });

  it("detects inconsistent proof", () => {
    const report = verifyLabel(application, validLabel.replace("90 Proof", "80 Proof"));
    expect(report.checks.find((check) => check.id === "abv")?.status).toBe("fail");
  });

  it("normalizes equivalent metric volume notation", () => {
    const report = verifyLabel(application, validLabel.replace("750 mL", "0.75 L"));
    expect(report.checks.find((check) => check.id === "net-contents")?.status).toBe("pass");
  });

  it("fails when the mandatory warning is absent", () => {
    const report = verifyLabel(application, validLabel.replace(GOVERNMENT_WARNING, ""));
    expect(report.checks.find((check) => check.id === "warning-wording")?.status).toBe("fail");
  });

  it("requires country of origin only for imports", () => {
    const report = verifyLabel(
      { ...application, imported: true, countryOfOrigin: "France" },
      `${validLabel}\nProduct of France`,
    );
    expect(report.checks.find((check) => check.id === "country-origin")?.status).toBe("pass");
  });

  it("accepts the multiline text produced by the bundled sample", () => {
    const sampleOcr = `EST. 1897

STONE'S THROW

Kentucky Straight

Bourbon Whiskey

45% Alc. by Vol. (90 Proof)
750 mL
Old Tom Distillery, Louisville, Kentucky

${GOVERNMENT_WARNING}`;
    const report = verifyLabel(application, sampleOcr, 95, 1800);
    expect(report.checks.filter((check) => check.status === "fail")).toHaveLength(0);
    expect(report.overallStatus).toBe("review");
  });
});
