-- 用户角色枚举
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- 用户资料表
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  email text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'user',
  preferred_theme text,
  preferred_language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 聊天记录表（跨会话持久化）
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_user_created_idx ON public.chat_messages (user_id, created_at DESC);

-- 新用户注册自动同步 profiles（仅同步注册收集字段，用户名从模拟邮箱前缀提取）
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, username, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    CASE WHEN NEW.email LIKE '%@miaoda.com' THEN split_part(NEW.email, '@', 1) ELSE NULL END,
    'user'::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 角色查询辅助函数（SECURITY DEFINER 防 RLS 自环）
CREATE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

-- 开启 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ===== profiles 策略（anon：无任何权限，显式拒绝；authenticated：本人读写 + 管理员全权）=====
CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM public.get_user_role(auth.uid()));

-- ===== chat_messages 策略（anon：无任何权限；authenticated：本人增删改查 + 管理员全权）=====
CREATE POLICY "Admins have full access to chat_messages" ON public.chat_messages
  FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat messages" ON public.chat_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);