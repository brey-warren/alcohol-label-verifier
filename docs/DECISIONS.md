# Engineering decisions

## 1. Distilled spirits first

The brief mentions beer, wine, and distilled spirits but provides a distilled-spirits example and explicitly values a complete core over unfinished breadth. The prototype implements one coherent distilled-spirits rule set. Beverage-specific strategies can later satisfy a common verifier interface.

## 2. Browser-only architecture

The stakeholder notes flag restrictive outbound networking and future privacy concerns. Keeping OCR in the browser removes the server, API credentials, document retention, and label transfer from this prototype. It also makes the app deployable as static files.

Trade-off: the OCR model increases the static download size and CPU performance varies by device. The worker is reused so initialization is paid once per session.

## 3. OCR is evidence, not the decision-maker

`ocr.ts` produces text and confidence. `extraction.ts` proposes structured fields. `verification.ts` applies deterministic comparisons. This separation makes false matches diagnosable and lets the rules be tested without running OCR.

## 4. Tolerant and strict checks coexist

Brand names use normalized comparison because case and punctuation differences can be immaterial. ABV, proof, volume, and prescribed warning wording receive stricter checks. Similar-but-uncertain results are escalated rather than silently accepted.

## 5. Visual requirements remain human-reviewed

Bold weight, physical type size, contrast, separation from other content, and field-of-vision rules cannot be safely inferred from arbitrary pixels alone. The prototype surfaces these boundaries explicitly. A production system could combine calibrated capture, layout models, and human confirmation.

## 6. Batch records are independent

The UI accepts a small group of images and gives every image an independent copy of the application data and manual-review checklist. Selecting a queued label switches both its expected values and its results, preventing cross-label comparisons. The prototype keeps manual data entry because the brief does not provide a COLA export contract. Production work should begin with that contract, then add CSV/JSON ingestion, resumability, and exportable results.

## 7. Visual-format decisions stay explicit

OCR can confirm warning wording and an uppercase heading, but it cannot reliably prove font weight, physical type size, contrast, or placement from arbitrary photographs. Each label therefore has a visible reviewer checklist for those requirements. Checklist state is kept separate from deterministic results so manual confirmation never masquerades as an automated finding.

## Future work

- Beverage-specific rule strategies for wine and malt beverages
- CSV/JSON application import and artwork pairing
- Perspective correction and glare detection
- Bounding-box overlays linking findings to label locations
- Calibrated size measurement
- Web Worker pool and device-aware batch concurrency
- Exportable audit record with rule-set versioning
- Evaluation dataset with field-level precision/recall and latency percentiles
