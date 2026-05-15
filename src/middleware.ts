import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect /admin — redirect unauthenticated users to admin sign-in
  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Only protect /admin here. /profile uses client-side auth check to avoid
  // redirect loops when the session cookie hasn't propagated yet on the edge.
  matcher: ['/admin/:path*'],
};
