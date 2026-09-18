export type CheckStatus = "pass" | "fail" | "review";

export interface ApplicationData {
  brandName: string;
  classType: string;
  abv: string;
  netContents: string;
  producer: string;
  imported: boolean;
  countryOfOrigin: string;
}

export interface WarningVisualReview {
  uppercaseHeading: boolean;
  boldHeading: boolean;
  legibleText: boolean;
  sufficientContrast: boolean;
  groupedAndUnobscured: boolean;
}

export interface ExtractedFields {
  brandName?: string;
  classType?: string;
  abv?: number;
  proof?: number;
  netContents?: string;
  producer?: string;
  countryOfOrigin?: string;
  warningText?: string;
  warningHeadingUppercase?: boolean;
}

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  expected: string;
  detected: string;
  explanation: string;
  confidence?: number;
}

export interface VerificationReport {
  overallStatus: CheckStatus;
  summary: string;
  checks: CheckResult[];
  extracted: ExtractedFields;
  rawText: string;
  durationMs: number;
  ocrConfidence: number;
}

export interface OcrProgress {
  status: string;
  progress: number;
}
