// 多主题换肤：默认墨夜（:root），其余主题通过 html[data-theme] 变量覆盖
// 偏好持久化：localStorage 即时生效；登录后同步到 profiles.preferred_theme 跨设备一致
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ThemeId } from '@/types/types';

const STORAGE_KEY = 'xr-theme';

export const THEMES: ThemeId[] = ['ink', 'snow', 'violet', 'amber', 'forest'];

function isValidTheme(v: string | null): v is ThemeId {
  return !!v && (THEMES as string[]).includes(v);
}

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (isValidTheme(v)) return v;
    } catch {
      // 隐私模式等场景忽略
    }
    return 'ink';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // 忽略写入失败
    }
  }, [theme]);

  // 登录后采用账号内保存的主题偏好（跨设备同步，仅在登录瞬间应用一次）
  useEffect(() => {
    if (profile?.id && isValidTheme(profile.preferred_theme)) {
      setThemeState(profile.preferred_theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    if (user) {
      supabase
        .from('profiles')
        .update({ preferred_theme: t })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error('同步主题偏好失败:', error);
        });
    }
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
