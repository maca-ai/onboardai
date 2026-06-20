export type CaptureInputKind = "screen-recording" | "keyboard-event-log" | "mouse-event-log" | "human-context-notes";

export interface RawCaptureArtifact {
  readonly captureId: string;
  readonly kind: CaptureInputKind;
  readonly path: string;
  readonly safety: "unsafe-to-share-local-only";
  readonly gitPolicy: "excluded-from-git";
}

export function createRawCaptureArtifact(captureId: string, kind: CaptureInputKind, path: string): RawCaptureArtifact {
  if (!path.startsWith("captures/raw/") && !path.startsWith("captures/unsafe/") && !path.startsWith("captures/tmp/")) {
    throw new Error("raw capture artifacts must stay under ignored raw, unsafe, or tmp capture paths");
  }

  return {
    captureId,
    kind,
    path,
    safety: "unsafe-to-share-local-only",
    gitPolicy: "excluded-from-git"
  };
}
