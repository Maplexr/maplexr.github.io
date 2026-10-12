// 数字分身聊天区：流式对话、预置问题、语音输入、语音播报、历史持久化、导出与清空
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Streamdown } from 'streamdown';
import { ChevronUp, Download, Loader2, Mic, Send, Square, Trash2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { sendStreamRequest } from '@/lib/sse';
import {
  convertToWav16k,
  recognizeSpeech,
  startRecording,
  stopRecording,
  synthesizeSpeech,
} from '@/lib/audio';
import {
  buildMarkdownExport,
  buildTextExport,
  clearChatHistory,
  downloadTextFile,
  fetchAllChatMessages,
  insertChatMessage,
  loadChatHistory,
  loadChatHistoryBefore,
} from '@/lib/chatApi';
import { fallbackReply } from '@/lib/avatarKnowledge';
import { AvatarStage, type AvatarStatus } from '@/components/home/AvatarStage';
import { AVATAR_URL } from '@/types/types';
import type { TranslationKey } from '@/lib/i18n';
import type { UiMessage } from '@/types/types';

const PRESETS: TranslationKey[] = ['chatPreset1', 'chatPreset2', 'chatPreset3'];
const PAGE_SIZE = 50;

const STATUS_KEY: Record<AvatarStatus, TranslationKey> = {
  idle: 'chatStatusIdle',
  listening: 'chatStatusListening',
  thinking: 'chatStatusThinking',
  speaking: 'chatStatusSpeaking',
};

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface MessageItemProps {
  message: UiMessage;
  playing: boolean;
  loadingTts: boolean;
  speakLabel: string;
  stopSpeakLabel: string;
  generatingLabel: string;
  onSpeak: (m: UiMessage) => void;
}

function MessageItem({
  message,
  playing,
  loadingTts,
  speakLabel,
  stopSpeakLabel,
  generatingLabel,
  onSpeak,
}: MessageItemProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-sm leading-relaxed text-secondary-foreground md:max-w-[75%]">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <img
        src={AVATAR_URL}
        alt="digital twin"
        className="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm leading-relaxed">
          {message.streaming && !message.content ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {generatingLabel}
            </span>
          ) : (
            <Streamdown parseIncompleteMarkdown={message.streaming} isAnimating={message.streaming}>
              {message.content}
            </Streamdown>
          )}
        </div>
        {!message.streaming && message.content && (
          <button
            type="button"
            onClick={() => onSpeak(message)}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            {loadingTts ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : playing ? (
              <Square className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
            <span>{playing ? stopSpeakLabel : speakLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface ChatSectionProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export function ChatSection({ onOpenAuth }: ChatSectionProps) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recognizing, setRecognizing] = useState(false);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [status, setStatus] = useState<AvatarStatus>('idle');
  const [hasMore, setHasMore] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const secondsRef = useRef(0);
  const recordingRef = useRef(false);
  const messagesRef = useRef<UiMessage[]>([]);
  const tRef = useRef(t);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 登录后加载跨会话历史；登出后清空本地会话
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setHasMore(false);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    loadChatHistory()
      .then((rows) => {
        if (cancelled) return;
        setMessages(rows.map((r) => ({ ...r })));
        setHasMore(rows.length === PAGE_SIZE);
      })
      .catch(() => toast.error(tRef.current('chatHistoryError')))
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // 卸载清理：计时器、音频、流
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      abortRef.current?.abort();
      audioRef.current?.pause();
    };
  }, []);

  // 新内容自动滚动（仅当用户本就在底部附近）
  useEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
    setStatus((s) => (s === 'speaking' ? 'idle' : s));
  };

  // ---------- 语音播报 ----------
  const handleSpeak = async (message: UiMessage) => {
    if (playingId === message.id) {
      stopAudio();
      return;
    }
    stopAudio();
    setTtsLoadingId(message.id);
    setStatus('speaking');
    try {
      const audio = await synthesizeSpeech(message.content);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingId(null);
        setStatus((s) => (s === 'speaking' ? 'idle' : s));
      };
      setPlayingId(message.id);
      try {
        await audio.play();
      } catch {
        setPlayingId(null);
        setStatus('idle');
        toast.info(t('audioPlayBlocked'));
      }
    } catch {
      setStatus('idle');
      toast.error(t('audioTtsError'));
    } finally {
      setTtsLoadingId(null);
    }
  };

  // ---------- 语音输入 ----------
  const finishRecording = async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    let blob: Blob;
    try {
      blob = await stopRecording();
    } catch {
      setRecording(false);
      setStatus('idle');
      return;
    }
    setRecording(false);
    setRecognizing(true);
    setStatus('thinking');
    try {
      const wav = await convertToWav16k(await blob.arrayBuffer());
      const text = await recognizeSpeech(wav);
      if (text) {
        setInput((prev) => (prev ? `${prev} ${text}` : text));
      } else {
        toast.info(tRef.current('audioSttEmpty'));
      }
    } catch {
      toast.error(tRef.current('audioSttError'));
    } finally {
      setRecognizing(false);
      setStatus('idle');
    }
  };

  const toggleMic = async () => {
    if (!user) {
      onOpenAuth('signin');
      return;
    }
    if (recognizing || streaming) return;
    if (recording) {
      await finishRecording();
      return;
    }
    try {
      await startRecording();
      recordingRef.current = true;
      secondsRef.current = 0;
      setRecordSeconds(0);
      setRecording(true);
      setStatus('listening');
      timerRef.current = window.setInterval(() => {
        secondsRef.current += 1;
        setRecordSeconds(secondsRef.current);
        if (secondsRef.current >= 60) {
          toast.info(tRef.current('audioRecordingMax'));
          void finishRecording();
        }
      }, 1000);
    } catch {
      toast.error(t('audioMicDenied'));
    }
  };

  // ---------- 发送与流式回复 ----------
  const finalizeStream = (placeholderId: string, finalContent: string) => {
    const content = finalContent.trim();
    setStreaming(false);
    setStatus('idle');
    if (!content) {
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === placeholderId ? { ...m, content, streaming: false } : m))
    );
    insertChatMessage('assistant', content).then((saved) => {
      if (saved) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId ? { ...m, id: saved.id, created_at: saved.created_at } : m
          )
        );
      } else {
        toast.error(tRef.current('chatSaveError'));
      }
    });
  };

  const handleSend = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || streaming || recognizing || recording) return;
    if (!user) {
      onOpenAuth('signin');
      return;
    }
    setInput('');
    stopAudio();

    const savedUser = await insertChatMessage('user', text);
    const userMsg: UiMessage =
      savedUser ?? {
        id: `tmp-u-${Date.now()}`,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      };
    setMessages((prev) => [...prev, userMsg]);

    const placeholderId = `tmp-a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: placeholderId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        streaming: true,
      },
    ]);
    setStreaming(true);
    setStatus('thinking');
    nearBottomRef.current = true;

    const history = [...messagesRef.current.filter((m) => !m.streaming), userMsg]
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = '';
    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      finalizeStream(placeholderId, acc);
    };
    const applyFallback = () => {
      if (!acc.trim()) acc = fallbackReply(text, lang);
    };

    await sendStreamRequest({
      functionUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/avatar-chat`,
      requestBody: { messages: history, lang },
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      signal: controller.signal,
      onData: (data) => {
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const chunk = parsed.choices?.[0]?.delta?.content ?? '';
          if (chunk) {
            acc += chunk;
            setMessages((prev) =>
              prev.map((m) => (m.id === placeholderId ? { ...m, content: acc } : m))
            );
          }
        } catch {
          // 跳过无法解析的帧
        }
      },
      onComplete: () => {
        applyFallback();
        finalize();
      },
      onError: () => {
        // 网络或上游异常：已有部分内容则保留，否则使用本地知识库兜底
        applyFallback();
        finalize();
      },
      onAborted: () => {
        // 用户主动停止：保留已生成的部分内容
        finalize();
      },
    });
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // ---------- 历史加载更多 ----------
  const handleLoadMore = async () => {
    const oldest = messagesRef.current.find((m) => !m.id.startsWith('tmp-'))?.created_at;
    if (!oldest) {
      setHasMore(false);
      return;
    }
    try {
      const older = await loadChatHistoryBefore(oldest);
      setMessages((prev) => [...older.map((r) => ({ ...r })), ...prev]);
      setHasMore(older.length === PAGE_SIZE);
    } catch {
      toast.error(t('chatHistoryError'));
    }
  };

  // ---------- 导出与清空 ----------
  const handleExport = async (format: 'md' | 'txt') => {
    if (!user || messages.length === 0) return;
    try {
      const all = await fetchAllChatMessages();
      const labels = {
        title: t('chatExportTitle'),
        you: t('chatExportYou'),
        twin: t('chatExportTwin'),
      };
      const stamp = new Date()
        .toISOString()
        .slice(0, 16)
        .replace('T', '-')
        .replace(':', '');
      if (format === 'md') {
        downloadTextFile(
          `xinrui-chat-${stamp}.md`,
          buildMarkdownExport(all, labels),
          'text/markdown'
        );
      } else {
        downloadTextFile(
          `xinrui-chat-${stamp}.txt`,
          buildTextExport(all, labels),
          'text/plain'
        );
      }
      toast.success(t('toastExported'));
    } catch {
      toast.error(t('chatHistoryError'));
    }
  };

  const handleClear = async () => {
    try {
      await clearChatHistory();
      setMessages([]);
      setHasMore(false);
      toast.success(t('toastCleared'));
    } catch {
      toast.error(t('chatClearError'));
    }
  };

  return (
    <section id="chat" className="calm-enter scroll-mt-20 pb-2 md:scroll-mt-24">
      <div className="mb-6">
        <h2 className="calm-indicator text-2xl font-semibold md:text-3xl">{t('chatTitle')}</h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">{t('chatSubtitle')}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t('chatAccuracyNote')}</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[280px_minmax(0,1fr)] md:gap-6">
        <AvatarStage status={status} />

        <div className="calm-panel flex h-[560px] min-w-0 flex-col overflow-hidden rounded-xl md:h-[620px]">
          {/* 面板头：状态 + 导出/清空 */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 md:px-5">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                status !== 'idle' ? 'bg-primary' : 'bg-muted-foreground/50'
              }`}
            />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {t(STATUS_KEY[status])}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs"
                    disabled={!user || messages.length === 0}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">{t('chatExport')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void handleExport('md')}>
                    {t('chatExportMd')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleExport('txt')}>
                    {t('chatExportTxt')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 px-0"
                disabled={!user || messages.length === 0}
                onClick={() => setClearOpen(true)}
                aria-label={t('chatClear')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* 消息流 */}
          <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 px-4 py-5 md:px-5">
              {loadingHistory && (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-2 pt-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingHistory && hasMore && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => void handleLoadMore()}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                    {t('chatLoadMore')}
                  </Button>
                </div>
              )}

              {!loadingHistory && messages.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8 text-center md:py-12">
                  <img
                    src={AVATAR_URL}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover ring-1 ring-border"
                  />
                  <p className="text-sm font-semibold">{t('chatEmptyTitle')}</p>
                  <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                    {t('chatEmptyDesc')}
                  </p>
                  {!user && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 h-8 px-3 text-xs"
                      onClick={() => onOpenAuth('signin')}
                    >
                      {t('chatLoginCta')}
                    </Button>
                  )}
                </div>
              )}

              {messages.map((m) => (
                <MessageItem
                  key={m.id}
                  message={m}
                  playing={playingId === m.id}
                  loadingTts={ttsLoadingId === m.id}
                  speakLabel={t('chatSpeak')}
                  stopSpeakLabel={t('chatStopSpeak')}
                  generatingLabel={t('chatGenerating')}
                  onSpeak={(msg) => void handleSpeak(msg)}
                />
              ))}
            </div>
          </div>

          {/* 输入区 */}
          <div className="border-t border-border px-4 py-3 md:px-5">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5">
              {PRESETS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => void handleSend(t(key))}
                  disabled={streaming}
                  className="shrink-0 whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t(key)}
                </button>
              ))}
            </div>

            {!user && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3.5 py-2.5">
                <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                  {t('chatLoginHint')}
                </span>
                <Button
                  size="sm"
                  className="h-8 shrink-0 px-3 text-xs"
                  onClick={() => onOpenAuth('signin')}
                >
                  {t('chatLoginCta')}
                </Button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="outline"
                className={`h-10 w-10 shrink-0 rounded-xl p-0 ${
                  recording
                    ? 'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive hover:text-destructive-foreground'
                    : ''
                }`}
                disabled={!user || recognizing || streaming}
                onClick={() => void toggleMic()}
                aria-label={recording ? t('chatMicStop') : t('chatMic')}
              >
                {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={!user}
                placeholder={t('chatPlaceholder')}
                className="min-h-10 max-h-32 min-w-0 flex-1 resize-none rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              {streaming ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 gap-1.5 rounded-xl px-3 text-xs"
                  onClick={handleStop}
                >
                  <Square className="h-3.5 w-3.5" />
                  {t('chatStopGen')}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-10 w-10 shrink-0 rounded-xl p-0"
                  disabled={!user || !input.trim() || recording || recognizing}
                  onClick={() => void handleSend()}
                  aria-label={t('chatSend')}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>

            {(recording || recognizing) && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {recording ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                    <span>
                      {formatSeconds(recordSeconds)} / 00:60 · {t('chatMicStop')}
                    </span>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>{t('chatRecognizing')}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('chatClearTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('chatClearDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('chatCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleClear()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('chatConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
