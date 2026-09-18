# Final submission checklist

This checklist tracks the take-home requirements and the remaining release work. Keep the pull request open until every release item is complete.

## Requirements coverage

- [x] Source code is organized in a GitHub repository.
- [x] README includes setup, run, test, and deployment instructions.
- [x] Architecture, tools, assumptions, trade-offs, and limitations are documented.
- [x] Browser-only OCR requires no API key or external inference endpoint.
- [x] Distilled-spirits fields are extracted and compared with application data.
- [x] Brand matching tolerates harmless capitalization, punctuation, and spacing differences.
- [x] Government warning wording is checked separately from visual formatting.
- [x] Uncertain findings are routed to human review.
- [x] Multiple images can be selected together, assigned independent application records, and processed sequentially.
- [x] The interface provides progress, individual file status, error recovery, and separate batch results.
- [x] Each result includes a per-label warning-format checklist for human confirmation.
- [x] A built-in sample label and a second synthetic batch-test label are included.
- [x] Unit tests, linting, and the production build pass locally and in GitHub Actions.
- [ ] A permanent deployed application URL is available.
- [ ] The deployed application has passed final desktop and mobile verification.
- [ ] The production URL is recorded in the README.

## Verified scenarios

| Scenario | Result |
| --- | --- |
| Built-in Old Tom label | 95% OCR confidence; completed under the five-second target |
| Intentional ABV mismatch | Correctly reported expected 40% versus detected 45% ABV |
| Two-file Choose files upload | Two distinct PNG files queued and processed independently |
| Batch result navigation | Selecting either filename switches the image and corresponding field report |
| River Glen synthetic label | Detected 40% ABV, 80 proof, 750 mL, and warning text; reported application mismatches |
| Independent batch records | Editing one label’s expected values does not change another label’s record |
| Warning visual review | Each label retains its own five-item manual checklist in browser memory |
| Automated verification | Ten unit tests, ESLint, TypeScript, and Vite production build pass |

## Release sequence

1. Deploy the open pull-request branch.
2. Test the hosted app on desktop and mobile.
3. Repeat a two-file upload on the hosted app and verify result switching.
4. Test invalid type, oversized file, unreadable image, and reset behavior.
5. Record the permanent production URL in the README and pull-request description.
6. Confirm GitHub Actions passes after the documentation update.
7. Merge the pull request into `main`.
8. Confirm the production deployment from `main` and submit both URLs.

## Declared limitations

- The completed rule set targets distilled spirits. Wine and malt beverages require separate strategies.
- A photograph cannot reliably prove physical type size, bold weight, contrast, or field-of-vision placement; those remain human-review items.
- Batch records are entered manually in the prototype. A production workflow should import and pair structured application records with artwork.
- OCR accuracy varies with focus, glare, perspective, resolution, and typography.
