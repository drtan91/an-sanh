import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

/**
 * Đăng nhập bằng Email & Mật khẩu (Dành cho nhân viên được cấp tài khoản)
 */
export const signInStaff = async (
  email: string,
  pass: string
): Promise<{ user: User | null; error: string | null }> => {
  if (!supabase) {
    return { user: null, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      let friendlyMessage = error.message;
      if (error.message.includes('Invalid login credentials')) {
        friendlyMessage = 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
      } else if (error.message.includes('Email not confirmed')) {
        friendlyMessage = 'Tài khoản chưa được kích hoạt qua email mời. Vui lòng kiểm tra hộp thư.';
      }
      return { user: null, error: friendlyMessage };
    }

    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Lỗi không xác định khi đăng nhập.' };
  }
};

/**
 * Đăng xuất khỏi phiên làm việc
 */
export const signOutStaff = async (): Promise<{ error: string | null }> => {
  if (!supabase) {
    return { error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Lỗi khi đăng xuất.' };
  }
};

/**
 * Lấy phiên đăng nhập hiện tại
 */
export const getStaffSession = async (): Promise<Session | null> => {
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
};

/**
 * Lắng nghe thay đổi trạng thái xác thực
 */
export const subscribeToAuthChanges = (
  callback: (user: User | null, session: Session | null) => void
) => {
  if (!supabase) {
    callback(null, null);
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user || null, session);
    }
  );

  return () => {
    subscription.unsubscribe();
  };
};
