import type { ApplicationData, ExtractedFields } from "../types";
import { bestMatchingLine, similarity } from "./text";

const WARNING_START = /government\s+warning\s*:/i;

function findCandidate(text: string, expected: string): string | undefined {
  const candidate = bestMatchingLine(text, expected);
  return candidate && similarity(candidate, expected) >= 0.35 ? candidate : undefined;
}

export function extractFields(text: string, application: ApplicationData): ExtractedFields {
  const abvMatch = text.match(
    /(?:alcohol\s*)?(\d{1,2}(?:\.\d+)?)\s*%\s*(?:alc(?:ohol)?\.?\s*(?:\/|by)?\s*vol(?:ume)?\.?)?/i,
  );
  const proofMatch = text.match(/(?:\(|\[)?\s*(\d{1,3}(?:\.\d+)?)\s*proof\s*(?:\)|\])?/i);
  const volumeMatch = text.match(
    /\b\d+(?:\.\d+)?\s*(?:mL\.?|millilit(?:er|re)s?|L|lit(?:er|re)s?)\b/i,
  );
  const originMatch = text.match(
    /(?:product\s+of|produced\s+in|distilled\s+in|country\s+of\s+origin\s*:?)[ \t]+([^\n,.]+)/i,
  );
  const warningIndex = text.search(WARNING_START);
  const warningText = warningIndex >= 0 ? text.slice(warningIndex).trim() : undefined;
  const rawWarningHeading = warningText?.match(/^[^:]+:/)?.[0];

  return {
    brandName: findCandidate(text, application.brandName),
    classType: findCandidate(text, application.classType),
    abv: abvMatch ? Number(abvMatch[1]) : undefined,
    proof: proofMatch ? Number(proofMatch[1]) : undefined,
    netContents: volumeMatch?.[0],
    producer: findCandidate(text, application.producer),
    countryOfOrigin: originMatch?.[1]?.trim(),
    warningText,
    warningHeadingUppercase: rawWarningHeading === "GOVERNMENT WARNING:",
  };
}
