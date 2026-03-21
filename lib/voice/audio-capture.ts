/**
 * Browser microphone capture that produces base64 PCM 16-bit chunks
 * suitable for ElevenLabs STT WebSocket.
 */
export class AudioCapture {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;

  onChunk: ((base64Pcm: string) => void) | null = null;

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.context = new AudioContext({ sampleRate: 16000 });
    const source = this.context.createMediaStreamSource(this.stream);

    // ScriptProcessorNode is deprecated but widely supported.
    // AudioWorkletNode is preferred in production.
    this.processor = this.context.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      const float32 = event.inputBuffer.getChannelData(0);
      const int16 = float32ToInt16(float32);
      const base64 = arrayBufferToBase64(int16.buffer as ArrayBuffer);
      this.onChunk?.(base64);
    };

    source.connect(this.processor);
    this.processor.connect(this.context.destination);
  }

  stop() {
    this.processor?.disconnect();
    this.processor = null;

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }
}

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return int16;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
