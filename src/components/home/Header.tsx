// 顶部导航栏：站点标识 + 语言切换 + 主题换肤 + 账号入口
import { Check, Languages, LogOut, Palette, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme, THEMES } from '@/contexts/ThemeContext';
import type { TranslationKey } from '@/lib/i18n';
import type { ThemeId } from '@/types/types';

const THEME_DOT: Record<ThemeId, string> = {
  ink: '#0d8fc4',
  snow: '#0878a8',
  violet: '#8b7bf6',
  amber: '#f5a90b',
  forest: '#0d9a63',
};

const THEME_KEY: Record<ThemeId, TranslationKey> = {
  ink: 'themeInk',
  snow: 'themeSnow',
  violet: 'themeViolet',
  amber: 'themeAmber',
  forest: 'themeForest',
};

interface HeaderProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export function Header({ onOpenAuth }: HeaderProps) {
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, profile, signOut } = useAuth();

  const displayName =
    profile?.username ?? (user?.email ? user.email.split('@')[0] : '');

  const handleSignOut = async () => {
    await signOut();
    toast.success(t('toastLogout'));
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 md:h-16 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="calm-panel flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="truncate text-sm font-semibold tracking-wide">
            {t('siteName')}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 px-2.5 text-xs font-semibold"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            aria-label={t('langLabel')}
          >
            <Languages className="h-4 w-4" />
            <span>{lang === 'zh' ? 'EN' : '中'}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 px-0"
                aria-label={t('themeLabel')}
              >
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t('themeLabel')}
              </DropdownMenuLabel>
              {THEMES.map((id) => (
                <DropdownMenuItem key={id} onClick={() => setTheme(id)} className="gap-2">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-border"
                    style={{ backgroundColor: THEME_DOT[id] }}
                  />
                  <span className="flex-1">{t(THEME_KEY[id])}</span>
                  {theme === id && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                    {(displayName || 'U').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden max-w-24 truncate text-xs md:inline">
                    {displayName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  {t('navLogout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-xs"
                onClick={() => onOpenAuth('signin')}
              >
                {t('navLogin')}
              </Button>
              <Button
                size="sm"
                className="h-9 px-3 text-xs"
                onClick={() => onOpenAuth('signup')}
              >
                {t('navRegister')}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
