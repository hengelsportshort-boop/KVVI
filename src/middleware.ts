import { defineMiddleware } from 'astro/middleware';

const ADMIN_KEY = process.env.ADMIN_KEY || '';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect } = context;

  if (!url.pathname.startsWith('/admin')) {
    return next();
  }

  // Allow login/logout pages without auth
  const openPaths = ['/admin/login', '/admin/logout'];
  if (openPaths.includes(url.pathname)) {
    return next();
  }

  const token = cookies.get('admin_token');
  if (!token || token.value !== ADMIN_KEY) {
    return redirect('/admin/login');
  }

  return next();
});
