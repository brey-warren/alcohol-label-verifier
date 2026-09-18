# LabelCheck AI

A privacy-first prototype that compares distilled-spirits label artwork with application data. OCR runs entirely in the browser; images are not uploaded or stored.

> **Prototype notice:** LabelCheck AI supports—not replaces—human compliance review. Its results are not an official TTB determination.

## What it does

- Accepts expected application values and one or more label images.
- Enhances images and performs local OCR with a bundled Tesseract model.
- Checks brand name, class/type, ABV, proof consistency, net contents, producer/bottler, country of origin for imports, and the government warning.
- Normalizes harmless brand differences such as capitalization, punctuation, and spacing.
- Shows the expected and detected value plus a plain-language explanation for every finding.
- Routes uncertain OCR and visual requirements to **Needs review** instead of presenting a false conclusion.
- Keeps independent application values and review notes for every image in a batch.
- Provides a per-label visual checklist for warning typography, legibility, contrast, and placement.
- Records OCR confidence and total processing time.

## Why this approach

The discovery notes established four constraints: results should be fast, the interface should suit a wide range of technical comfort, label matching needs nuance, and production networks may block external ML services. The prototype therefore uses:

1. **Local OCR:** no API key, external inference endpoint, or image transfer.
2. **Deterministic rules:** extraction and verification are separate, testable modules.
3. **Three outcomes:** Match, Issue, or Review. Automation does not hide uncertainty.
4. **Progressive scope:** the working distilled-spirits path is complete before broader beverage coverage.

See [`docs/DECISIONS.md`](docs/DECISIONS.md) for detailed trade-offs.

## Run locally or in GitHub Codespaces

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. To run the quality checks:

```bash
npm test
npm run lint
npm run build
```

No environment variables are required.

## Deploy

This is a static Vite application. Import the repository into Vercel and accept the detected defaults:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: none

The bundled OCR runtime and English language model make the deployed application independent of external AI APIs.

## Verification behavior

| Requirement | Automated behavior | Human review boundary |
| --- | --- | --- |
| Brand name | Case-, punctuation-, and spacing-tolerant comparison | Material wording differences |
| Class/type | Normalized exact or similarity comparison | Close but non-identical wording |
| Alcohol content | Numeric ABV comparison and `proof = 2 × ABV` check | Poor OCR confidence |
| Net contents | Converts liters and milliliters to a common value | Physical type size and placement |
| Producer/bottler | Tolerant name-and-address comparison | Ambiguous or incomplete OCR |
| Country of origin | Required when the application is marked imported | Origin phrasing not recognized |
| Warning wording | Compares against the prescribed federal text | Near matches are escalated |
| Warning formatting | Detects uppercase heading where possible | Bold weight, type size, contrast, separation, and paragraph layout |

## Scope and limitations

- The prototype targets **distilled spirits**, matching the supplied example. Wine and malt beverages have different requirements and should use separate rule sets.
- OCR quality depends on resolution, focus, glare, perspective, and typography.
- A photograph does not provide a reliable physical scale. The app cannot conclusively measure millimeter type size without calibrated capture data.
- OCR alone cannot reliably prove bold font weight, background contrast, field-of-vision placement, or continuous-paragraph layout. These receive a manual-review result.
- Every batch file has its own editable application record. A production batch flow should additionally ingest structured application data rather than requiring manual entry.
- The first review may take longer while the browser initializes the OCR engine; subsequent images reuse the worker.

## Regulatory references

The rule descriptions were informed by current official TTB guidance:

- [Distilled Spirits Labeling: Mandatory Label Information](https://www.ttb.gov/regulated-commodities/beverage-alcohol/distilled-spirits/ds-labeling-home/ds-brand-label)
- [Distilled Spirits Labeling: Alcohol Content](https://www.ttb.gov/regulated-commodities/beverage-alcohol/distilled-spirits/ds-labeling-home/ds-alcohol-content)
- [Distilled Spirits Labeling: Net Contents](https://www.ttb.gov/regulated-commodities/beverage-alcohol/distilled-spirits/ds-labeling-home/ds-net-contents)
- [Distilled Spirits Labeling: Health Warning Statement](https://www.ttb.gov/regulated-commodities/beverage-alcohol/distilled-spirits/ds-labeling-home/ds-health-warning)

## Project structure

```text
src/
  lib/
    extraction.ts      OCR text → candidate fields
    ocr.ts             local OCR and image preprocessing
    text.ts            normalization and similarity helpers
    verification.ts    deterministic compliance checks
  App.tsx              accessible review workflow
  styles.css           responsive interface
public/
  sample-label.png     synthetic test label used by the demo
  test-labels/         additional synthetic batch-test artwork
  tessdata/            bundled English OCR model
  tesseract*/          bundled OCR worker/runtime
docs/
  DECISIONS.md         architecture and trade-offs
  FINAL_CHECKLIST.md   requirements coverage and release checklist
```

## Testing

Unit tests cover tolerant brand matching, ABV mismatch, proof consistency, equivalent metric volumes, missing warning text, import-country checks, independent application records, conditional origin requirements, and isolated visual-review state. Manual browser verification covers local OCR, intentional mismatches, and a two-file batch selected through the real file picker. The GitHub Actions workflow runs tests, linting, and a production build for every push and pull request.

See [`docs/FINAL_CHECKLIST.md`](docs/FINAL_CHECKLIST.md) for the verified scenarios and remaining release steps.

## Accessibility and privacy

- Semantic headings, labels, visible focus states, status text in addition to color, keyboard-operable controls, and reduced-motion support.
- Uploaded images remain in browser memory and are released when the review is reset.
- There is no analytics, account system, database, or network submission of label data.

## AI and tooling disclosure

Generative AI was used as an engineering assistant during planning and implementation. Architecture, requirements interpretation, rule behavior, tests, and generated code were reviewed and validated by the developer. Runtime label analysis does not call a generative-AI service.
