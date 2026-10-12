// 数字分身形象展示：头像 + 状态联动（待命/聆听/思考/播报）
import { motion } from 'motion/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AVATAR_URL } from '@/types/types';

export type AvatarStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AvatarStageProps {
  status: AvatarStatus;
}

export function AvatarStage({ status }: AvatarStageProps) {
  const { t } = useLanguage();
  const active = status !== 'idle';

  const statusText =
    status === 'idle'
      ? t('chatStatusIdle')
      : status === 'listening'
        ? t('chatStatusListening')
        : status === 'thinking'
          ? t('chatStatusThinking')
          : t('chatStatusSpeaking');

  return (
    <aside className="calm-panel flex items-center gap-5 rounded-xl p-5 md:flex-col md:p-6 md:text-center">
      <div className="relative shrink-0">
        <img
          src={AVATAR_URL}
          alt={t('chatTitle')}
          className="h-20 w-20 rounded-full object-cover ring-1 ring-border md:h-32 md:w-32"
        />
        {active && (
          <motion.span
            className="absolute -inset-1 rounded-full border border-primary/40"
            animate={{ opacity: [0.2, 0.65, 0.2] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1 md:flex-none">
        <p className="text-sm font-semibold md:text-base">{t('chatTitle')}</p>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground md:justify-center">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              active ? 'bg-primary' : 'bg-muted-foreground/50'
            }`}
          />
          <span className="truncate">{statusText}</span>
        </div>
        <p className="mt-2.5 hidden text-xs leading-relaxed text-muted-foreground/80 md:block">
          {t('chatSubtitle')}
        </p>
        <div className="mt-3.5 hidden h-4 items-center gap-1 md:flex" aria-hidden="true">
          {active &&
            [0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="h-3.5 w-0.5 rounded-full bg-primary/70"
                animate={
                  status === 'speaking'
                    ? { scaleY: [0.35, 1, 0.35] }
                    : { opacity: [0.3, 0.9, 0.3] }
                }
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
              />
            ))}
        </div>
      </div>
    </aside>
  );
}
