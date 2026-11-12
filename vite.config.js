import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // This key is read by Vite's server, not injected into client-side JavaScript.
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.ORS_API_KEY || env.VITE_ORS_API_KEY || '';
  const orsProxy = {
    target: 'https://api.openrouteservice.org',
    changeOrigin: true,
    secure: true,
    rewrite: path => path.replace(/^\/api\/ors/, ''),
    configure(proxy) {
      proxy.on('proxyReq', request => {
        if (apiKey) request.setHeader('Authorization', apiKey);
      });
    }
  };
  return {
    base: '/',
    server: { host: '0.0.0.0', proxy: { '/api/ors': orsProxy } },
    preview: { host: '0.0.0.0', proxy: { '/api/ors': orsProxy } },
    build: { target: 'es2022', rollupOptions: { input: {
      index: 'index.html', welcome: 'welcome.html', about: 'about.html', info: 'info.html'
    } } }
  };
});
