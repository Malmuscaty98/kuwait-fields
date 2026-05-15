import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin';

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Validate next to prevent open redirects (must start with /)
      const safePath = next.startsWith('/') ? next : '/profile';
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  // If no next param, default to customer profile; if it looks like admin callback use admin login
  const errorRedirect = next.startsWith('/admin') ? '/auth/signin' : '/auth/login';
  return NextResponse.redirect(`${origin}${errorRedirect}?error=auth_callback_error`);
}
