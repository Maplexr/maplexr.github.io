// 中英文语言系统：全站文案即时切换，偏好持久化并同步账号
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { translations, type TranslationKey } from '@/lib/i18n';
import type { Language } from '@/types/types';

const STORAGE_KEY = 'xr-lang';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'zh' || v === 'en') return v;
    } catch {
      // 忽略
    }
    return 'zh';
  });

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // 忽略写入失败
    }
  }, [lang]);

  // 登录后采用账号内保存的语言偏好
  useEffect(() => {
    const v = profile?.preferred_language;
    if (profile?.id && (v === 'zh' || v === 'en')) {
      setLangState(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const setLang = (l: Language) => {
    setLangState(l);
    if (user) {
      supabase
        .from('profiles')
        .update({ preferred_language: l })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error('同步语言偏好失败:', error);
        });
    }
  };

  const t = (key: TranslationKey): string =>
    translations[lang][key] ?? translations.zh[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
