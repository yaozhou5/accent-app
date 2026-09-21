const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mp4;codecs=mp4a.40.2"];

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia
  );
}

/** Returns a supported mime type, or "" to let MediaRecorder pick its own default. */
export function pickAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export const MAX_RECORDING_MS = 3 * 60 * 1000;
export const TARGET_MS = 60 * 1000;
