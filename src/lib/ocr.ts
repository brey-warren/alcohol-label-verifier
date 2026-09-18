import { createWorker, OEM, PSM, type Worker } from "tesseract.js";
import type { OcrProgress } from "../types";

let workerPromise: Promise<Worker> | null = null;
let progressListener: ((progress: OcrProgress) => void) | undefined;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng", OEM.LSTM_ONLY, {
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract-core",
      langPath: "/tessdata",
      logger: (message) => {
        if (typeof message.progress === "number") {
          progressListener?.({ status: message.status, progress: message.progress });
        }
      },
    }).then(async (worker) => {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: "1",
      });
      return worker;
    });
  }
  return workerPromise;
}

async function preprocessImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 2400;
  const scale = Math.min(2, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not prepare the image for OCR.");

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.25 + 128));
    data[index] = contrasted;
    data[index + 1] = contrasted;
    data[index + 2] = contrasted;
  }
  context.putImageData(image, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image conversion failed."))),
      "image/png",
    );
  });
}

export async function recognizeLabel(
  file: File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<{ text: string; confidence: number; durationMs: number }> {
  const startedAt = performance.now();
  progressListener = onProgress;
  onProgress?.({ status: "enhancing image", progress: 0.05 });
  const image = await preprocessImage(file);
  const worker = await getWorker();
  const result = await worker.recognize(image);
  progressListener = undefined;
  return {
    text: result.data.text,
    confidence: result.data.confidence,
    durationMs: performance.now() - startedAt,
  };
}

export function resetOcrWorker(): void {
  if (workerPromise) {
    void workerPromise.then((worker) => worker.terminate());
    workerPromise = null;
  }
}
