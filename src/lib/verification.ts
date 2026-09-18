import type {
  ApplicationData,
  CheckResult,
  CheckStatus,
  ExtractedFields,
  VerificationReport,
} from "../types";
import { normalizeName, normalizeText, parseVolume, similarity } from "./text";
import { extractFields } from "./extraction";

export const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

function textCheck(
  id: string,
  label: string,
  expected: string,
  detected: string | undefined,
  tolerant = false,
): CheckResult {
  if (!detected) {
    return {
      id,
      label,
      status: "fail",
      expected,
      detected: "Not detected",
      explanation: `${label} could not be confidently located in the label image.`,
    };
  }

  const exact = tolerant
    ? normalizeName(expected) === normalizeName(detected)
    : normalizeText(expected) === normalizeText(detected);
  const score = similarity(expected, detected);
  if (exact || (tolerant && score >= 0.9)) {
    return {
      id,
      label,
      status: "pass",
      expected,
      detected,
      explanation: tolerant
        ? "Matches after normalizing capitalization, punctuation, and spacing."
        : "Matches the application value.",
      confidence: Math.round(score * 100),
    };
  }

  if (score >= 0.72) {
    return {
      id,
      label,
      status: "review",
      expected,
      detected,
      explanation: "The values are similar but not identical. An agent should confirm the difference.",
      confidence: Math.round(score * 100),
    };
  }

  return {
    id,
    label,
    status: "fail",
    expected,
    detected,
    explanation: "The detected value does not match the application.",
    confidence: Math.round(score * 100),
  };
}

function abvCheck(expected: string, extracted: ExtractedFields): CheckResult {
  const expectedValue = Number.parseFloat(expected);
  if (extracted.abv === undefined) {
    return {
      id: "abv",
      label: "Alcohol content",
      status: "fail",
      expected: `${expectedValue}% ABV`,
      detected: "Not detected",
      explanation: "No percentage alcohol-by-volume statement was detected.",
    };
  }

  const matches = Math.abs(expectedValue - extracted.abv) < 0.01;
  const proofConsistent =
    extracted.proof === undefined || Math.abs(extracted.proof - extracted.abv * 2) < 0.01;
  const detected = `${extracted.abv}% ABV${
    extracted.proof === undefined ? "" : ` (${extracted.proof} proof)`
  }`;

  return {
    id: "abv",
    label: "Alcohol content",
    status: matches && proofConsistent ? "pass" : "fail",
    expected: `${expectedValue}% ABV`,
    detected,
    explanation: !matches
      ? "The label ABV does not match the application."
      : !proofConsistent
        ? "The stated proof is inconsistent with the detected ABV."
        : "ABV matches, and any displayed proof is mathematically consistent.",
  };
}

function volumeCheck(expected: string, detected: string | undefined): CheckResult {
  const expectedMl = parseVolume(expected);
  const detectedMl = detected ? parseVolume(detected) : undefined;
  if (detectedMl === undefined) {
    return {
      id: "net-contents",
      label: "Net contents",
      status: "fail",
      expected,
      detected: "Not detected",
      explanation: "No metric net-contents statement was detected.",
    };
  }
  const matches = expectedMl === detectedMl;
  return {
    id: "net-contents",
    label: "Net contents",
    status: matches ? "pass" : "fail",
    expected,
    detected: detected ?? "Not detected",
    explanation: matches
      ? "The values represent the same metric volume."
      : "The detected volume does not match the application.",
  };
}

function warningChecks(extracted: ExtractedFields): CheckResult[] {
  const detected = extracted.warningText;
  if (!detected) {
    return [
      {
        id: "warning-wording",
        label: "Government warning wording",
        status: "fail",
        expected: GOVERNMENT_WARNING,
        detected: "Not detected",
        explanation: "The mandatory government health warning was not detected.",
      },
      {
        id: "warning-format",
        label: "Government warning format",
        status: "review",
        expected: "Uppercase bold heading; continuous, legible paragraph",
        detected: "Cannot assess without warning text",
        explanation: "Formatting requires human review of the original image.",
      },
    ];
  }

  const expectedNormalized = normalizeText(GOVERNMENT_WARNING);
  const detectedNormalized = normalizeText(detected).slice(0, expectedNormalized.length);
  const score = similarity(expectedNormalized, detectedNormalized);
  const wordingStatus: CheckStatus = score >= 0.97 ? "pass" : score >= 0.86 ? "review" : "fail";

  return [
    {
      id: "warning-wording",
      label: "Government warning wording",
      status: wordingStatus,
      expected: GOVERNMENT_WARNING,
      detected,
      explanation:
        wordingStatus === "pass"
          ? "The prescribed warning wording was detected."
          : wordingStatus === "review"
            ? "OCR found nearly matching wording; verify the original image character by character."
            : "The detected warning differs materially from the prescribed wording.",
      confidence: Math.round(score * 100),
    },
    {
      id: "warning-format",
      label: "Government warning format",
      status: "review",
      expected: "Uppercase bold heading; continuous, legible paragraph",
      detected: extracted.warningHeadingUppercase
        ? "Uppercase heading detected; other formatting unverified"
        : "Uppercase heading not confirmed",
      explanation:
        "OCR cannot reliably prove bold weight, physical type size, contrast, separation, or continuous-paragraph layout. An agent must inspect the image.",
    },
  ];
}

export function verifyLabel(
  application: ApplicationData,
  rawText: string,
  ocrConfidence = 100,
  durationMs = 0,
): VerificationReport {
  const extracted = extractFields(rawText, application);
  const checks: CheckResult[] = [
    textCheck("brand", "Brand name", application.brandName, extracted.brandName, true),
    textCheck("class-type", "Class/type", application.classType, extracted.classType),
    abvCheck(application.abv, extracted),
    volumeCheck(application.netContents, extracted.netContents),
    textCheck("producer", "Producer/bottler", application.producer, extracted.producer, true),
  ];

  if (application.imported) {
    checks.push(
      textCheck(
        "country-origin",
        "Country of origin",
        application.countryOfOrigin,
        extracted.countryOfOrigin,
        true,
      ),
    );
  }
  checks.push(...warningChecks(extracted));

  const hasFailure = checks.some((check) => check.status === "fail");
  const needsReview = checks.some((check) => check.status === "review") || ocrConfidence < 75;
  const overallStatus: CheckStatus = hasFailure ? "fail" : needsReview ? "review" : "pass";
  const summary = hasFailure
    ? "Potential compliance issues found"
    : needsReview
      ? "Automated checks passed; human review required"
      : "All automated checks passed";

  return {
    overallStatus,
    summary,
    checks,
    extracted,
    rawText,
    durationMs,
    ocrConfidence,
  };
}
