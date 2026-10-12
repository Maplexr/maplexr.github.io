// 辛瑞个人主页：头部导航 + 个人信息展示 + 数字分身聊天 + 页脚
import { useEffect, useState } from 'react';
import { Header } from '@/components/home/Header';
import { ProfileAbout, ProfileHero } from '@/components/home/ProfileSection';
import { ContactSection, PortfolioSection } from '@/components/home/PortfolioContactSections';
import { ChatSection } from '@/components/home/ChatSection';
import { AuthDialog } from '@/components/home/AuthDialog';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  // 页面标题随语言切换
  useEffect(() => {
    document.title = t('siteName');
  }, [t]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header onOpenAuth={openAuth} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 pb-12 md:px-6 md:pb-16">
          <ProfileHero />
          <div className="mt-6 md:mt-7">
            <ChatSection onOpenAuth={openAuth} />
          </div>
          <div className="calm-divider my-10 md:my-14" />
          <ProfileAbout />
          <div className="calm-divider my-10 md:my-14" />
          <PortfolioSection />
          <div className="calm-divider my-10 md:my-14" />
          <ContactSection />
        </div>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-1 px-4 py-6 text-center md:px-6">
          <p className="text-xs text-muted-foreground">{t('footerText')}</p>
          <p className="text-xs text-muted-foreground/70">{t('footerSlogan')}</p>
        </div>
      </footer>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultMode={authMode} />
    </div>
  );
}
