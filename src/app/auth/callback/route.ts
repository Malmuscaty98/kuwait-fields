import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code      = searchParams.get('code');
  const next      = searchParams.get('next') ?? '/admin';
  const type      = searchParams.get('type');           // 'recovery' for password reset

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password recovery — always redirect to reset-password page
      if (type === 'recovery' || next === '/auth/reset-password') {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      // Normal auth callback
      const safePath = next.startsWith('/') ? next : '/profile';
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  const errorRedirect = next.startsWith('/admin') ? '/auth/signin' : '/auth/login';
  return NextResponse.redirect(`${origin}${errorRedirect}?error=auth_callback_error`);
}
