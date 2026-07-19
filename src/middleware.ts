import { defineMiddleware } from 'astro/middleware';

const ADMIN_KEY = (process.env.ADMIN_KEY || 'eV4VhIuB8dGjK2mN9pQrX5wZ7yC3fA0s').trim();

// Rate limiting state (in-memory, per IP)
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getClientIP(context: any): string {
  const forwarded = context.request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return context.clientAddress || 'unknown';
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect } = context;

  // === STEP 1: Rate limiting for admin login ===
  if (url.pathname === '/admin/login' && context.request.method === 'POST') {
    const ip = getClientIP(context);
    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (record && record.blockedUntil > now) {
      return new Response(
        '<html><body style="font-family:sans-serif;padding:40px"><h1>429 - Te veel pogingen</h1><p>Je IP is tijdelijk geblokkeerd na 5 mislukte inlogpogingen. Probeer het over 15 minuten opnieuw.</p></body></html>',
        {
          status: 429,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Retry-After': String(Math.ceil((record.blockedUntil - now) / 1000))
          }
        }
      );
    }

    // Let the login page process the request first
    const response = await next();

    // After login attempt, check if it was a failure and count it
    if (response && response.status !== 302 && response.status !== 429) {
      // The POST returned the login page again (likely wrong key)
      if (!record || record.blockedUntil <= now) {
        loginAttempts.set(ip, { count: 1, blockedUntil: 0 });
      } else {
        record.count += 1;
        if (record.count >= MAX_ATTEMPTS) {
          record.blockedUntil = now + BLOCK_DURATION_MS;
        }
        loginAttempts.set(ip, record);
      }
    } else if (response && response.status === 302) {
      // Successful login - clear attempts
      loginAttempts.delete(ip);
    }

    // Clean up old entries periodically
    if (Math.random() < 0.1) {
      for (const [ipKey, rec] of loginAttempts) {
        if (rec.blockedUntil > 0 && rec.blockedUntil < now) {
          loginAttempts.delete(ipKey);
        }
      }
    }

    // Add security headers + charset
    if (response) {
      const headers = new Headers(response.headers);
      const ct = headers.get('Content-Type') || '';
      if (ct.startsWith('text/html')) {
        headers.set('Content-Type', 'text/html; charset=utf-8');
      }
      headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:; frame-src 'self' https:; media-src 'self' https:; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com;");
      headers.set('X-Frame-Options', 'DENY');
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    return response;
  }

  // === STEP 2: Admin auth check ===
  if (url.pathname.startsWith('/admin')) {
    const openPaths = ['/admin/login', '/admin/logout'];
    if (!openPaths.includes(url.pathname)) {
      const token = cookies.get('admin_token');
      if (!token || token.value !== ADMIN_KEY) {
        // API endpoints → JSON 401, HTML pages → redirect naar login
        if (url.pathname.startsWith('/admin/api/')) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return redirect('/admin/login');
      }
    }
  }

  // === STEP 3: Continue and add security headers ===
  const response = await next();
  if (response) {
    const headers = new Headers(response.headers);
    const ct = headers.get('Content-Type') || '';
    if (ct.startsWith('text/html')) {
      headers.set('Content-Type', 'text/html; charset=utf-8');
    }
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:; frame-src 'self' https:; media-src 'self' https:; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com;");
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  return response;
});