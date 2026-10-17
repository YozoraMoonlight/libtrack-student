import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

const laravelPaths = [
  '/mobile',
  '/dashboard',
  '/student',
  '/books',
  '/borrowings',
  '/my-fines',
  '/user',
  '/api',
  '/logout',
];

function laravelProxy(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    secure: true,
    bypass(request) {
      const isBrowserNavigation =
        request.headers.accept?.includes('text/html') &&
        !request.headers['x-requested-with'] &&
        !request.headers['x-inertia'];

      return isBrowserNavigation ? '/index.html' : undefined;
    },
    configure(proxy) {
      proxy.on('proxyRes', (proxyResponse) => {
        const location = proxyResponse.headers.location;
        if (typeof location === 'string' && location.startsWith(target)) {
          proxyResponse.headers.location = location.slice(target.length) || '/';
        }

        // The live Laravel host is HTTPS, while the Vite dev origin is local
        // HTTP. Keep the Laravel session usable during local development by
        // removing only the upstream Secure/Domain attributes in this proxy.
        const cookies = proxyResponse.headers['set-cookie'];
        if (Array.isArray(cookies)) {
          proxyResponse.headers['set-cookie'] = cookies.map((cookie) =>
            cookie.replace(/;\s*Secure/gi, '').replace(/;\s*Domain=laravel\.cloud/gi, ''),
          );
        }
      });
    },
  };
}

function spaFallback(): Plugin {
  return {
    name: 'libtrack-spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathname = (req.url || '').split('?')[0];
        if (pathname === '/app' || pathname.startsWith('/app/')) req.url = '/index.html';
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = (env.LIBTRACK_LARAVEL_ORIGIN || 'https://libtrack.laravel.cloud').replace(/\/$/, '');
  const proxy = Object.fromEntries(laravelPaths.map((path) => [path, laravelProxy(target)]));

  return {
    appType: 'spa',
    plugins: [spaFallback(), react()],
    server: {
      host: '0.0.0.0',
      proxy,
    },
  };
});
