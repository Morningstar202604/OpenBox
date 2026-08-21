import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { getSupabase, hasSupabase, AUTH_ENABLED } from '@/lib/supabase';
import { useToastStore } from './useToastStore';
import { useI18nStore } from '@/i18n/useI18n';
import { dict } from '@/i18n/translations';

const authOn = AUTH_ENABLED && hasSupabase;

/** 在 zustand store 中获取当前语言的翻译文本 */
function authT(key: string): string {
  const lang = useI18nStore.getState().lang;
  return dict[lang][key] ?? dict.zh[key] ?? key;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  showAuth: boolean;
  mode: 'signin' | 'signup';
  error: string | null;
  openAuth: (mode?: 'signin' | 'signup') => void;
  closeAuth: () => void;
  setMode: (m: 'signin' | 'signup') => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: authOn,
  showAuth: false,
  mode: 'signin',
  error: null,

  openAuth: (mode = 'signin') => set({ showAuth: true, mode, error: null }),
  closeAuth: () => set({ showAuth: false, error: null }),
  setMode: (m) => set({ mode: m, error: null }),

  signIn: async (email, password) => {
    const sb = await getSupabase();
    if (!sb) return;
    set({ error: null, loading: true });
    const { error } = await sb.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) { set({ error: error.message }); return; }
    set({ showAuth: false, error: null });
    useToastStore.getState().push(authT('auth.loginSuccess'), 'success');
  },

  signUp: async (email, password) => {
    const sb = await getSupabase();
    if (!sb) return;
    set({ error: null, loading: true });
    const { data, error } = await sb.auth.signUp({ email, password });
    set({ loading: false });
    if (error) { set({ error: error.message }); return; }
    // Supabase 开启「邮箱确认」时，注册成功但无会话：提示去查收邮件；
    // 关闭「确认邮箱」时直接返回 session，可立即登录。
    if (!data.session) {
      set({ showAuth: false, error: null });
      useToastStore.getState().push(authT('auth.signupNeedConfirm'), 'success');
      return;
    }
    set({ showAuth: false, error: null });
    useToastStore.getState().push(authT('auth.signupSuccess'), 'success');
  },

  signOut: async () => {
    const sb = await getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    set({ user: null });
    useToastStore.getState().push(authT('auth.logoutSuccess'), 'success');
  },
}));

// 会话初始化与监听（仅在同时配了 AUTH_ENABLED 和 Supabase 凭证时生效）
function applyUser(u: User | null) {
  useAuthStore.setState({ user: u, loading: false });
}
if (authOn) {
  // init → onAuthStateChange 的初始回调会触发两次 applyUser（getSession + onAuthStateChange），
  // 这不会导致 bug：applyUser 是幂等 setState，且 useFavoritesStore 的 subscribe 用 state.user && !prev.user 去重。
  void getSupabase().then((sb) => {
    if (!sb) return;
    void sb.auth.getSession().then(({ data }) => applyUser(data.session?.user ?? null));
    void sb.auth.onAuthStateChange((_event, session) => applyUser(session?.user ?? null));
  });
}
