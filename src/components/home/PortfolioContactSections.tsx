import { useState } from 'react';
import { ArrowUpRight, Check, Copy, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const WECHAT_ID = 'Kyrie725798';
const EMAIL = '201214537@qq.com';

export function PortfolioSection() {
  const { t } = useLanguage();

  return (
    <section id="work" className="calm-enter scroll-mt-20 md:scroll-mt-24">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="calm-indicator text-xl font-semibold md:text-2xl">{t('workTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('workIntro')}</p>
      </div>
      <a
        href="#chat"
        className="calm-panel group mt-6 flex flex-col gap-6 rounded-xl p-5 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-end sm:justify-between md:p-7"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-primary">{t('workNumber')}</p>
          <h3 className="mt-3 text-lg font-semibold md:text-xl">{t('workProjectTitle')}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            {t('workProjectDescription')}
          </p>
          <p className="mt-5 text-xs text-muted-foreground">{t('workProjectMeta')}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary">
          {t('workView')}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </a>
    </section>
  );
}

export function ContactSection() {
  const { t } = useLanguage();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const copyWechat = async () => {
    try {
      await navigator.clipboard.writeText(WECHAT_ID);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  return (
    <section id="contact" className="calm-enter scroll-mt-20 md:scroll-mt-24">
      <h2 className="calm-indicator text-xl font-semibold md:text-2xl">{t('contactTitle')}</h2>
      <p className="mt-4 text-sm leading-relaxed text-foreground/85 md:text-base">
        {t('contactIntro')}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="calm-panel rounded-xl p-5">
          <p className="text-xs font-medium text-muted-foreground">{t('contactWechatLabel')}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="select-all break-all text-base font-semibold">{WECHAT_ID}</span>
            <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 px-2 text-xs text-primary" onClick={copyWechat}>
              {copyState === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {t(copyState === 'copied' ? 'contactCopied' : 'contactCopy')}
            </Button>
          </div>
          {copyState === 'error' && <p role="status" className="mt-2 text-xs text-muted-foreground">{t('contactCopyError')}</p>}
        </div>
        <a href={`mailto:${EMAIL}`} className="calm-panel group rounded-xl p-5 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p className="text-xs font-medium text-muted-foreground">{t('contactEmailLabel')}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="break-all text-base font-semibold">{EMAIL}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              {t('contactEmailAction')}
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </a>
      </div>
      <div className="mt-5 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p>{t('contactNote')}</p>
        <a href="#chat" className="inline-flex shrink-0 items-center gap-1.5 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <MessageCircle className="h-3.5 w-3.5" />
          {t('contactChat')}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  );
}
