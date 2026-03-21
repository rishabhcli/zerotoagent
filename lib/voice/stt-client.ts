/**
 * ElevenLabs Realtime Speech-to-Text WebSocket client.
 * Connects to the STT endpoint, sends PCM audio chunks,
 * and emits partial/committed transcript callbacks.
 */
export class RealtimeSTTClient {
  private ws: WebSocket | null = null;
  private token: string;

  onPartial: ((text: string) => void) | null = null;
  onCommit: ((text: string) => void) | null = null;
  onError: ((error: unknown) => void) | null = null;

  constructor(opts: {
    token: string;
    onPartial?: (text: string) => void;
    onCommit?: (text: string) => void;
    onError?: (error: unknown) => void;
  }) {
    this.token = opts.token;
    this.onPartial = opts.onPartial ?? null;
    this.onCommit = opts.onCommit ?? null;
    this.onError = opts.onError ?? null;
  }

  connect() {
    const url = new URL("wss://api.elevenlabs.io/v1/speech-to-text/realtime");
    url.searchParams.set("model_id", "scribe_v2_realtime");
    url.searchParams.set("token", this.token);
    url.searchParams.set("audio_format", "pcm_16000");

    this.ws = new WebSocket(url.toString());

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);

        if (data.type === "partial_transcript" && data.text) {
          this.onPartial?.(data.text);
        } else if (data.type === "committed_transcript" && data.text) {
          this.onCommit?.(data.text);
        }
      } catch (err) {
        this.onError?.(err);
      }
    };

    this.ws.onerror = (event) => {
      this.onError?.(event);
    };

    this.ws.onclose = () => {
      console.log("[stt] WebSocket closed");
    };
  }

  sendAudio(base64Chunk: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          event: "input_audio_chunk",
          audio_data: base64Chunk,
        })
      );
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
