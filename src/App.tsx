import { useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileImage,
  HelpCircle,
  LockKeyhole,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { recognizeLabel } from "./lib/ocr";
import {
  cloneApplication,
  countConfirmedReviewItems,
  createWarningReview,
  isApplicationComplete,
} from "./lib/review";
import { verifyLabel } from "./lib/verification";
import type {
  ApplicationData,
  CheckResult,
  OcrProgress,
  VerificationReport,
  WarningVisualReview,
} from "./types";

const DEFAULT_APPLICATION: ApplicationData = {
  brandName: "OLD TOM DISTILLERY",
  classType: "Kentucky Straight Bourbon Whiskey",
  abv: "45",
  netContents: "750 mL",
  producer: "Old Tom Distillery, Louisville, Kentucky",
  imported: false,
  countryOfOrigin: "",
};

type FileResult = {
  id: string;
  file: File;
  previewUrl: string;
  application: ApplicationData;
  warningReview: WarningVisualReview;
  report?: VerificationReport;
  error?: string;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_BATCH_SIZE = 20;

const WARNING_REVIEW_ITEMS: Array<{
  key: keyof WarningVisualReview;
  label: string;
  help: string;
}> = [
  {
    key: "uppercaseHeading",
    label: "Heading is uppercase",
    help: 'Confirm the heading reads “GOVERNMENT WARNING:” in all capital letters.',
  },
  {
    key: "boldHeading",
    label: "Heading appears bold",
    help: "Confirm the heading is visually heavier than the warning body text.",
  },
  {
    key: "legibleText",
    label: "Warning is legible",
    help: "Confirm the type is readable in the submitted artwork without magnification artifacts.",
  },
  {
    key: "sufficientContrast",
    label: "Contrast is adequate",
    help: "Confirm the warning is clearly distinguishable from its background.",
  },
  {
    key: "groupedAndUnobscured",
    label: "Statement is together and unobscured",
    help: "Confirm the heading and both paragraphs are presented together and not hidden by other elements.",
  },
];

function StatusIcon({ status }: { status: CheckResult["status"] }) {
  if (status === "pass") return <CheckCircle2 aria-hidden="true" />;
  if (status === "fail") return <AlertCircle aria-hidden="true" />;
  return <AlertTriangle aria-hidden="true" />;
}

function formatStatus(status: CheckResult["status"]): string {
  return status === "pass" ? "Match" : status === "fail" ? "Issue" : "Review";
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function App() {
  const [applicationTemplate, setApplicationTemplate] = useState(DEFAULT_APPLICATION);
  const [files, setFiles] = useState<FileResult[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OcrProgress>({ status: "ready", progress: 0 });
  const [formError, setFormError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const selected = files.find((item) => item.id === selectedId) ?? files[0];
  const selectedPosition = selected ? files.findIndex((item) => item.id === selected.id) + 1 : 0;
  const completedReports = files.filter((item) => item.report).length;
  const activeApplication = selected?.application ?? applicationTemplate;

  function updateApplication<K extends keyof ApplicationData>(key: K, value: ApplicationData[K]) {
    if (selected) {
      setFiles((current) =>
        current.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                application: { ...item.application, [key]: value },
                report: undefined,
                error: undefined,
              }
            : item,
        ),
      );
    } else {
      setApplicationTemplate((current) => ({ ...current, [key]: value }));
    }
    setFormError("");
  }

  function updateWarningReview(key: keyof WarningVisualReview, value: boolean) {
    if (!selected) return;
    setFiles((current) =>
      current.map((item) =>
        item.id === selected.id
          ? { ...item, warningReview: { ...item.warningReview, [key]: value } }
          : item,
      ),
    );
  }

  function addFiles(incoming: File[]) {
    const errors: string[] = [];
    const valid = incoming.filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: use JPG, PNG, or WebP.`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: file is larger than 12 MB.`);
        return false;
      }
      return true;
    });

    const capacity = Math.max(0, MAX_BATCH_SIZE - files.length);
    const defaults = selected?.application ?? applicationTemplate;
    const additions = valid.slice(0, capacity).map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      application: cloneApplication(defaults),
      warningReview: createWarningReview(),
    }));
    if (valid.length > capacity) {
      errors.push(`A review batch can contain up to ${MAX_BATCH_SIZE} labels.`);
    }
    setFiles((current) => [...current, ...additions]);
    if (!selectedId && additions[0]) setSelectedId(additions[0].id);
    setFormError(errors.join(" "));
  }

  async function loadSample() {
    const response = await fetch("/sample-label.png");
    const blob = await response.blob();
    const sample = new File([blob], "old-tom-sample-label.png", {
      type: "image/png",
      lastModified: Date.now(),
    });
    addFiles([sample]);
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const next = current.filter((item) => item.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id);
      return next;
    });
  }

  async function analyze() {
    if (!files.length) {
      setFormError("Upload at least one label image.");
      return;
    }
    const incomplete = files.find((item) => !isApplicationComplete(item.application));
    if (incomplete) {
      setSelectedId(incomplete.id);
      setFormError(`Complete all required application fields for ${incomplete.file.name}.`);
      return;
    }

    setIsProcessing(true);
    setFormError("");
    setFiles((current) => current.map((item) => ({ ...item, report: undefined, error: undefined })));

    for (const item of files) {
      setSelectedId(item.id);
      try {
        const ocr = await recognizeLabel(item.file, setProgress);
        const report = verifyLabel(item.application, ocr.text, ocr.confidence, ocr.durationMs);
        setFiles((current) =>
          current.map((candidate) => (candidate.id === item.id ? { ...candidate, report } : candidate)),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "The image could not be analyzed.";
        setFiles((current) =>
          current.map((candidate) =>
            candidate.id === item.id ? { ...candidate, error: message } : candidate,
          ),
        );
      }
    }

    setProgress({ status: "complete", progress: 1 });
    setIsProcessing(false);
  }

  function reset() {
    files.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setFiles([]);
    setSelectedId(undefined);
    setApplicationTemplate({ ...DEFAULT_APPLICATION });
    setProgress({ status: "ready", progress: 0 });
    setFormError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="LabelCheck AI home">
          <span className="brand-mark"><ScanLine aria-hidden="true" /></span>
          <span>LabelCheck <strong>AI</strong></span>
        </a>
        <div className="privacy-pill"><LockKeyhole aria-hidden="true" /> Local processing · No uploads</div>
        <a className="help-link" href="#methodology"><HelpCircle aria-hidden="true" /> Methodology</a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="eyebrow"><Sparkles aria-hidden="true" /> Compliance review assistant</div>
          <h1>Verify alcohol labels<br /><span>with confidence.</span></h1>
          <p>
            Compare label artwork against application data in seconds. Every result is explainable,
            and uncertain findings stay with the human reviewer.
          </p>
          <div className="hero-meta">
            <span><ShieldCheck aria-hidden="true" /> Privacy-first</span>
            <span><Clock3 aria-hidden="true" /> Target: under 5 seconds</span>
            <span><ScanLine aria-hidden="true" /> Local OCR</span>
          </div>
        </section>

        <section className="workflow" aria-label="Label verification workflow">
          <div className="step-card">
            <div className="step-heading"><span>1</span><div><h2>Application details</h2><p>Enter the values the label should contain.</p></div></div>
            <div className="record-context" role="status">
              {selected ? (
                <><strong>Editing label {selectedPosition} of {files.length}</strong><span>{selected.file.name} · Changes apply only to this label.</span></>
              ) : (
                <><strong>Application defaults</strong><span>These values will be copied into each label you add.</span></>
              )}
            </div>
            <div className="form-grid">
              <Field label="Brand name">
                <input value={activeApplication.brandName} onChange={(event) => updateApplication("brandName", event.target.value)} required disabled={isProcessing} />
              </Field>
              <Field label="Class / type">
                <input value={activeApplication.classType} onChange={(event) => updateApplication("classType", event.target.value)} required disabled={isProcessing} />
              </Field>
              <Field label="Alcohol by volume" hint="Enter the number only">
                <div className="input-suffix"><input inputMode="decimal" value={activeApplication.abv} onChange={(event) => updateApplication("abv", event.target.value)} required disabled={isProcessing} /><span>%</span></div>
              </Field>
              <Field label="Net contents">
                <input value={activeApplication.netContents} onChange={(event) => updateApplication("netContents", event.target.value)} required disabled={isProcessing} />
              </Field>
              <Field label="Producer / bottler" hint="Name and address as submitted">
                <input value={activeApplication.producer} onChange={(event) => updateApplication("producer", event.target.value)} required disabled={isProcessing} />
              </Field>
              <label className="checkbox-field">
                <input type="checkbox" checked={activeApplication.imported} onChange={(event) => updateApplication("imported", event.target.checked)} disabled={isProcessing} />
                <span><strong>Imported product</strong><small>Require a country-of-origin statement</small></span>
              </label>
              {activeApplication.imported && (
                <Field label="Country of origin">
                  <input value={activeApplication.countryOfOrigin} onChange={(event) => updateApplication("countryOfOrigin", event.target.value)} required disabled={isProcessing} />
                </Field>
              )}
            </div>
          </div>

          <div className="step-card">
            <div className="step-heading"><span>2</span><div><h2>Label artwork</h2><p>Upload one label or a small review batch.</p></div></div>
            <button
              className="dropzone"
              type="button"
              disabled={isProcessing}
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); addFiles(Array.from(event.dataTransfer.files)); }}
            >
              <UploadCloud aria-hidden="true" />
              <strong>Drop label images here</strong>
              <span>or choose files · JPG, PNG, WebP · up to 12 MB each</span>
              <em>Choose files</em>
            </button>
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={isProcessing}
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []));
                event.currentTarget.value = "";
              }}
            />
            <div className="sample-row"><span>No label handy?</span><button type="button" onClick={loadSample} disabled={isProcessing}>Use the sample label</button></div>

            {files.length > 0 && (
              <div className="file-list" aria-label="Selected label images">
                {files.map((item, index) => (
                  <div className={`file-chip ${selected?.id === item.id ? "active" : ""}`} key={item.id}>
                    <button className="file-select" type="button" onClick={() => setSelectedId(item.id)} aria-pressed={selected?.id === item.id}>
                      <FileImage aria-hidden="true" />
                      <span>{item.file.name}<small>Label {index + 1} · {item.application.brandName || "Application incomplete"}</small></span>
                      <span className={`file-state ${item.report?.overallStatus ?? ""}`}>{item.report ? formatStatus(item.report.overallStatus) : item.error ? "Error" : "Ready"}</span>
                    </button>
                    <button type="button" className="remove-file" aria-label={`Remove ${item.file.name}`} onClick={() => removeFile(item.id)} disabled={isProcessing}><X aria-hidden="true" /></button>
                  </div>
                ))}
              </div>
            )}

            {formError && <div className="form-error" role="alert"><AlertCircle aria-hidden="true" />{formError}</div>}

            <button className="analyze-button" type="button" onClick={analyze} disabled={isProcessing}>
              {isProcessing ? <><span className="spinner" /> Analyzing {completedReports + 1} of {files.length}…</> : <><ScanLine aria-hidden="true" /> Analyze {files.length > 1 ? `${files.length} labels` : "label"}</>}
            </button>
            {isProcessing && (
              <div className="progress-wrap" aria-live="polite">
                <div className="progress-label"><span>{progress.status}</span><strong>{Math.round(progress.progress * 100)}%</strong></div>
                <div className="progress-track"><span style={{ width: `${Math.round(progress.progress * 100)}%` }} /></div>
              </div>
            )}
          </div>
        </section>

        {selected?.error && <section className="error-panel" role="alert"><AlertCircle /><div><h2>We couldn’t analyze this image</h2><p>{selected.error}</p><p>Try a sharper, evenly lit image with the label filling the frame.</p></div></section>}

        {selected?.report && (
          <Results
            report={selected.report}
            previewUrl={selected.previewUrl}
            filename={selected.file.name}
            position={selectedPosition}
            total={files.length}
            warningReview={selected.warningReview}
            onWarningReviewChange={updateWarningReview}
          />
        )}

        {(files.length > 0 || selected?.report) && (
          <div className="reset-row"><button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> Start a new review</button></div>
        )}

        <section id="methodology" className="methodology">
          <div><span className="section-kicker">Designed for accountable automation</span><h2>AI assists. Agents decide.</h2></div>
          <div className="method-grid">
            <article><strong>01</strong><h3>Private by design</h3><p>Images and OCR remain in the browser. There is no external AI service and no document storage.</p></article>
            <article><strong>02</strong><h3>Explainable rules</h3><p>OCR proposes text; deterministic comparisons make each finding visible and testable.</p></article>
            <article><strong>03</strong><h3>Human judgment retained</h3><p>Typography, physical type size, contrast, and uncertain OCR are routed to manual review.</p></article>
          </div>
        </section>
      </main>

      <footer><span>LabelCheck AI · Prototype</span><span>Not an official TTB determination</span></footer>
    </div>
  );
}

function Results({
  report,
  previewUrl,
  filename,
  position,
  total,
  warningReview,
  onWarningReviewChange,
}: {
  report: VerificationReport;
  previewUrl: string;
  filename: string;
  position: number;
  total: number;
  warningReview: WarningVisualReview;
  onWarningReviewChange: (key: keyof WarningVisualReview, value: boolean) => void;
}) {
  const counts = report.checks.reduce(
    (total, check) => ({ ...total, [check.status]: total[check.status] + 1 }),
    { pass: 0, fail: 0, review: 0 },
  );
  const confirmedReviewItems = countConfirmedReviewItems(warningReview);

  return (
    <section className="results" aria-labelledby="results-heading">
      <div className={`result-summary ${report.overallStatus}`}>
        <div className="summary-icon"><StatusIcon status={report.overallStatus} /></div>
        <div><span className="section-kicker">Verification complete</span><h2 id="results-heading">{report.summary}</h2><p>{filename} · {Math.round(report.ocrConfidence)}% OCR confidence · {(report.durationMs / 1000).toFixed(1)} seconds</p></div>
        <div className="score-strip"><span className="pass"><strong>{counts.pass}</strong> matched</span><span className="review"><strong>{counts.review}</strong> review</span><span className="fail"><strong>{counts.fail}</strong> issues</span></div>
      </div>

      <div className="results-layout">
        <div className="image-panel">
          <div className="panel-title">
            <span>Selected label image</span>
            <small>Label {position} of {total} · {filename}</small>
          </div>
          <img src={previewUrl} alt={`Selected alcohol label: ${filename}`} />
          <fieldset className="visual-review">
            <legend>Government warning visual review</legend>
            <p>
              Confirm the requirements that cannot be established reliably from OCR alone.
              Selections stay in this browser session.
            </p>
            <div className="review-progress" aria-live="polite">
              <strong>{confirmedReviewItems} of {WARNING_REVIEW_ITEMS.length} confirmed</strong>
              <span>{confirmedReviewItems === WARNING_REVIEW_ITEMS.length ? "Manual review complete" : "Reviewer confirmation required"}</span>
            </div>
            <div className="visual-review-list">
              {WARNING_REVIEW_ITEMS.map((item) => (
                <label key={item.key}>
                  <input
                    type="checkbox"
                    checked={warningReview[item.key]}
                    onChange={(event) => onWarningReviewChange(item.key, event.target.checked)}
                  />
                  <span><strong>{item.label}</strong><small>{item.help}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="checks-panel">
          <div className="panel-title"><span>Field checks</span><small>{report.checks.length} requirements reviewed</small></div>
          <div className="check-list">
            {report.checks.map((check) => (
              <article className={`check-row ${check.status}`} key={check.id}>
                <div className="check-icon"><StatusIcon status={check.status} /></div>
                <div className="check-body">
                  <div className="check-title"><h3>{check.label}</h3><span>{formatStatus(check.status)}</span></div>
                  <div className="comparison"><div><small>Expected</small><p>{check.expected}</p></div><div><small>Detected</small><p>{check.detected}</p></div></div>
                  <p className="explanation">{check.explanation}</p>
                </div>
              </article>
            ))}
          </div>
          <details className="raw-text"><summary>View extracted OCR text <ChevronDown aria-hidden="true" /></summary><pre>{report.rawText}</pre></details>
        </div>
      </div>
    </section>
  );
}

export default App;
