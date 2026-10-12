// 登录/注册弹窗：用户名 + 密码，注册需勾选用户协议与隐私政策
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode: 'signin' | 'signup';
}

export function AuthDialog({ open, onOpenChange, defaultMode }: AuthDialogProps) {
  const { t } = useLanguage();
  const { signInWithUsername, signUpWithUsername } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [agreed, setAgreed] = useState(false);
  const [legal, setLegal] = useState<'ua' | 'pp' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setAgreed(false);
    }
  }, [open, defaultMode]);

  const schema = useMemo(
    () =>
      z.object({
        username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/, t('authBadUsername')),
        password: z.string().min(6, t('authShortPwd')),
      }),
    [t]
  );
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const mapError = (message: string): string => {
    if (/already registered|already exists/i.test(message)) return t('authTaken');
    if (/Invalid login credentials/i.test(message)) return t('authBadCreds');
    if (/at least 6 characters/i.test(message)) return t('authShortPwd');
    return message;
  };

  const onSubmit = async (values: FormValues) => {
    if (mode === 'signup' && !agreed) {
      toast.error(t('authAgreeFirst'));
      return;
    }
    setSubmitting(true);
    try {
      const action = mode === 'signin' ? signInWithUsername : signUpWithUsername;
      const { error } = await action(values.username, values.password);
      if (error) {
        toast.error(mapError(error.message));
        return;
      }
      toast.success(mode === 'signin' ? t('authSuccessSignIn') : t('authSuccessSignUp'));
      onOpenChange(false);
      form.reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === 'signin' ? t('authSignInTitle') : t('authSignUpTitle')}
            </DialogTitle>
            <DialogDescription>
              {mode === 'signin' ? t('authDescSignIn') : t('authDescSignUp')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('authUsername')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('authUsernamePh')} autoComplete="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('authPassword')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('authPasswordPh')}
                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {mode === 'signup' && (
                <div className="flex items-start gap-2.5 rounded-lg border border-border p-3">
                  <Checkbox
                    id="agreement"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="agreement" className="text-xs leading-relaxed text-muted-foreground">
                    {t('authAgreePrefix')}
                    <button
                      type="button"
                      className="mx-0.5 text-primary underline underline-offset-2"
                      onClick={() => setLegal('ua')}
                    >
                      {t('authUserAgreement')}
                    </button>
                    {t('authAnd')}
                    <button
                      type="button"
                      className="mx-0.5 text-primary underline underline-offset-2"
                      onClick={() => setLegal('pp')}
                    >
                      {t('authPrivacyPolicy')}
                    </button>
                  </label>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting
                  ? t('authProcessing')
                  : mode === 'signin'
                    ? t('authSubmitSignIn')
                    : t('authSubmitSignUp')}
              </Button>
            </form>
          </Form>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>{mode === 'signin' ? t('authNoAccount') : t('authHasAccount')}</span>
            <button
              type="button"
              className="text-primary underline underline-offset-2"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? t('authGoSignUp') : t('authGoSignIn')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={legal !== null}
        onOpenChange={(o) => {
          if (!o) setLegal(null);
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>{legal === 'ua' ? t('authUaTitle') : t('authPpTitle')}</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {legal === 'ua' ? t('authUaBody') : t('authPpBody')}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
