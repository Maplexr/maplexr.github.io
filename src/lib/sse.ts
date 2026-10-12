// SSE 流式请求工具（ky + eventsource-parser）
import ky, {
  type AfterResponseHook,
  type KyResponse,
  type NormalizedOptions,
} from 'ky';
import { createParser, type EventSourceParser } from 'eventsource-parser';

interface SSEOptions {
  /** 接收到数据帧时的回调 */
  onData: (data: string) => void;
  /** 流式响应完成时的回调（可选） */
  onCompleted?: (error?: Error) => void;
  /** 请求被中断时的回调（可选） */
  onAborted?: () => void;
}

/** 创建 SSE AfterResponseHook，用于处理 ky 的流式响应 */
export function createSSEHook(options: SSEOptions): AfterResponseHook {
  const hook: AfterResponseHook = async (
    request: Request,
    _options: NormalizedOptions,
    response: KyResponse
  ) => {
    if (!response.ok || !response.body) return;

    let completed = false;
    const finish = (error?: Error): void => {
      if (completed) return;
      completed = true;
      options.onCompleted?.(error);
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf8');
    const parser: EventSourceParser = createParser({
      onEvent: (event) => {
        if (!event.data) return;
        // 处理单 message 多 data 字段的场景
        for (const chunk of event.data.split('\n')) {
          options.onData(chunk);
        }
      },
    });

    const read = (): void => {
      reader
        .read()
        .then((result) => {
          if (result.done) {
            finish();
            return;
          }
          parser.feed(decoder.decode(result.value, { stream: true }));
          read();
        })
        .catch((error) => {
          if (request.signal.aborted) {
            options.onAborted?.();
            return;
          }
          finish(error as Error);
        });
    };

    read();
    return response;
  };

  return hook;
}

export interface StreamRequestOptions {
  /** Edge Function URL */
  functionUrl: string;
  /** 请求体 */
  requestBody: unknown;
  /** Supabase 匿名密钥 */
  supabaseAnonKey: string;
  /** 接收到每个 SSE 数据帧的回调 */
  onData: (data: string) => void;
  /** 请求完成回调 */
  onComplete: () => void;
  /** 错误处理回调 */
  onError: (error: Error) => void;
  /** 中断回调（可选） */
  onAborted?: () => void;
  /** 中断信号（可选） */
  signal?: AbortSignal;
}

/** 发送流式请求到 Supabase Edge Function */
export async function sendStreamRequest(options: StreamRequestOptions): Promise<void> {
  const {
    functionUrl,
    requestBody,
    supabaseAnonKey,
    onData,
    onComplete,
    onError,
    onAborted,
    signal,
  } = options;

  const sseHook = createSSEHook({
    onData,
    onCompleted: (error?: Error) => {
      if (error) onError(error);
      else onComplete();
    },
    onAborted: () => onAborted?.(),
  });

  try {
    await ky.post(functionUrl, {
      json: requestBody,
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      signal,
      hooks: { afterResponse: [sseHook] },
    });
  } catch (error) {
    if (!signal?.aborted) onError(error as Error);
  }
}
