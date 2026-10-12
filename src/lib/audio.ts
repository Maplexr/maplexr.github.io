// 语音能力：录音（webm/mp4 → 16kHz WAV）、语音识别（STT）、语音合成（TTS，带缓存）
import { supabase } from '@/db/supabase';

// ---------- 录音 ----------
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

function pickMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/mpeg',
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

/** 开始录音，返回 MediaRecorder 实例 */
export async function startRecording(): Promise<MediaRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const mimeType = pickMimeType();
  recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined
  );
  chunks = [];
  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(250);
  return recorder;
}

/** 停止录音并返回音频 Blob（webm/mp4 等浏览器原生格式） */
export async function stopRecording(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!recorder) {
      reject(new Error('No active recorder'));
      return;
    }
    const r = recorder;
    r.onstop = () => {
      r.stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: r.mimeType || 'audio/webm' }));
      recorder = null;
    };
    r.stop();
  });
}

// ---------- 浏览器格式 → 16kHz 单声道 16bit WAV ----------
export async function convertToWav16k(arrayBuffer: ArrayBuffer): Promise<Blob> {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close().catch(() => undefined);
  }

  const targetRate = 16000;
  const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
  const offline = new OfflineAudioContext(1, length, targetRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  const pcm = rendered.getChannelData(0);

  // WAV 编码（44 字节头 + 16bit PCM 单声道）
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------- 语音识别（Edge Function，返回识别文本） ----------
export async function recognizeSpeech(wavBlob: Blob): Promise<string> {
  const speech = await blobToBase64(wavBlob);
  const { data, error } = await supabase.functions.invoke('short-speech-recognition', {
    body: {
      speech,
      len: wavBlob.size,
      format: 'wav',
      rate: 16000,
      cuid: 'xinrui-web',
    },
  });
  if (error) throw error;
  if (data?.err_no !== 0) {
    throw new Error(`Speech recognition error ${data?.err_no}: ${data?.err_msg}`);
  }
  return data?.result?.[0] ?? '';
}

// ---------- 语音合成（Edge Function 二进制流 + 本地缓存，避免重复计费） ----------
const ttsCache = new Map<string, string>();

/** 合成语音，返回可直接播放的 HTMLAudioElement（相同文本走缓存） */
export async function synthesizeSpeech(text: string): Promise<HTMLAudioElement> {
  const clipped = text.trim().slice(0, 500);
  if (!clipped) throw new Error('Empty text');

  let url = ttsCache.get(clipped);
  if (!url) {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-short-web`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ text: clipped, per: 1 }),
      }
    );
    if (resp.status === 429 || resp.status === 402) {
      throw new Error(resp.status === 429 ? 'quota' : 'balance');
    }
    if (!resp.ok) throw new Error(`TTS request failed: ${resp.status}`);
    const blob = await resp.blob();
    url = URL.createObjectURL(blob);
    ttsCache.set(clipped, url);
  }
  return new Audio(url);
}
