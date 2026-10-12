// 个人信息展示区：头像 + 名字 + 一句话介绍 + 兴趣标签 + 信息卡片
import {
  ArrowDownRight,
  ArrowUpRight,
  Compass,
  GraduationCap,
  MessageCircle,
  Telescope,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { AVATAR_URL } from '@/types/types';

export function ProfileHero() {
  const { t } = useLanguage();

  const interests = [
    t('profileInterestFitness'),
    t('profileInterestBasketball'),
    t('profileInterestAiDrama'),
    t('profileInterestMedia'),
  ];

  return (
    <section className="calm-enter border-b border-border/70 pb-6 pt-7 md:pb-8 md:pt-10">
      <div className="relative md:grid md:grid-cols-[minmax(0,1fr)_9rem] md:items-center md:gap-8">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-3 pr-16 text-xs font-semibold tracking-[0.14em] text-primary md:pr-0">
            <span className="h-px w-6 shrink-0 bg-primary" aria-hidden="true" />
            {t('profileBadge')}
          </span>
          <h1 className="mt-6 text-balance text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.035em] text-foreground md:mt-4 md:text-[3.25rem]">
            {t('profileName')}
          </h1>
          <p className="mt-3 max-w-[34rem] text-pretty text-base leading-[1.6] text-foreground/85 md:text-[1.0625rem] md:leading-[1.55]">
            {t('profileTagline')}
          </p>
          <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4 md:mt-6">
            <Button asChild size="lg" className="h-11 rounded-md px-5 text-sm font-semibold shadow-none sm:w-auto">
              <a href="#chat">
                <MessageCircle className="h-4 w-4" />
                {t('chatTitle')}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-11 px-2 text-sm text-muted-foreground shadow-none hover:text-foreground sm:w-auto">
              <a href="#about">
                {t('profileAboutTitle')}
                <ArrowDownRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs font-medium tracking-wide text-muted-foreground md:mt-7">
            {interests.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
        <div className="absolute right-0 top-0 h-10 w-10 overflow-hidden rounded-md border border-border bg-muted md:relative md:h-36 md:w-36 md:justify-self-end md:rounded-lg">
          <img src={AVATAR_URL} alt={t('profileName')} className="h-full w-full object-cover" />
        </div>
      </div>
    </section>
  );
}

export function ProfileAbout() {
  const { t } = useLanguage();

  const cards = [
    { icon: GraduationCap, label: t('profileIdentityLabel'), value: t('profileIdentityValue') },
    { icon: Compass, label: t('profileFocusLabel'), value: t('profileFocusValue') },
    { icon: Zap, label: t('profileTraitsLabel'), value: t('profileTraitsValue') },
    { icon: Telescope, label: t('profileVisionLabel'), value: t('profileVisionValue') },
  ];

  return (
    <section id="about" className="calm-enter scroll-mt-20 pb-2 md:scroll-mt-24">
      <h2 className="calm-indicator text-xl font-semibold md:text-2xl">
        {t('profileAboutTitle')}
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map(({ icon: Icon, label, value }, i) => (
          <div
            key={label}
            className="calm-panel intersect:opacity-100 rounded-xl p-5 opacity-0 transition-all duration-700"
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="mt-3 text-pretty text-sm leading-relaxed md:text-base">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
