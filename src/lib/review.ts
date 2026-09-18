import type { ApplicationData, WarningVisualReview } from "../types";

export const EMPTY_WARNING_REVIEW: WarningVisualReview = {
  uppercaseHeading: false,
  boldHeading: false,
  legibleText: false,
  sufficientContrast: false,
  groupedAndUnobscured: false,
};

export function cloneApplication(application: ApplicationData): ApplicationData {
  return { ...application };
}

export function createWarningReview(): WarningVisualReview {
  return { ...EMPTY_WARNING_REVIEW };
}

export function isApplicationComplete(application: ApplicationData): boolean {
  return Boolean(
    application.brandName.trim() &&
      application.classType.trim() &&
      application.abv.trim() &&
      application.netContents.trim() &&
      application.producer.trim() &&
      (!application.imported || application.countryOfOrigin.trim()),
  );
}

export function countConfirmedReviewItems(review: WarningVisualReview): number {
  return Object.values(review).filter(Boolean).length;
}
