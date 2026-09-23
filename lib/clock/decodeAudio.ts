const TARGET_SAMPLE_RATE = 16000;

export type DecodedAudio = {
  audio: Float32Array;
  durationMs: number;
};

/**
 * Decodes an audio Blob to mono Float32 PCM at 16 kHz (what Whisper expects)
 * and returns the real duration measured from the decoded audio.
 * MediaRecorder's own elapsed-time timer and the length of the final
 * encoded file can differ by a frame or two — anything shown to the user
 * should come from here, not the timer, so it always matches what plays
 * back.
 */
export async function decodeAudio(blob: Blob): Promise<DecodedAudio> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error("This browser can't decode audio.");
  }
  let audioCtx: AudioContext;
  try {
    audioCtx = new AudioContextCtor({ sampleRate: TARGET_SAMPLE_RATE });
  } catch (err) {
    console.error(`Failed to construct AudioContext at ${TARGET_SAMPLE_RATE}Hz:`, err);
    throw new Error(
      `Couldn't open an audio context at ${TARGET_SAMPLE_RATE}Hz — ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`
    );
  }
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const { numberOfChannels, length } = audioBuffer;
    const audio =
      numberOfChannels === 1 ? audioBuffer.getChannelData(0).slice() : mixDown(audioBuffer, numberOfChannels, length);
    return { audio, durationMs: audioBuffer.duration * 1000 };
  } catch (err) {
    console.error("decodeAudioData failed:", err, { contextSampleRate: audioCtx.sampleRate, blobType: blob.type });
    throw new Error(
      `Couldn't decode the recording — ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`
    );
  } finally {
    await audioCtx.close().catch(() => {});
  }
}

function mixDown(audioBuffer: AudioBuffer, numberOfChannels: number, length: number): Float32Array {
  const mono = new Float32Array(length);
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const data = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / numberOfChannels;
    }
  }
  return mono;
}
