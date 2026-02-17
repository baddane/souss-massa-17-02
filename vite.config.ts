import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 3001,
        host: true,
        open: true
      },
      plugins: [react()],
      define: {
        'process.env': JSON.stringify(env),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@/src': path.resolve(__dirname, 'src'),
          '@/components': path.resolve(__dirname, 'components'),
          '@/pages': path.resolve(__dirname, 'pages'),
          '@/services': path.resolve(__dirname, 'services'),
          '@/contexts': path.resolve(__dirname, 'contexts'),
          '@/types': path.resolve(__dirname, 'types'),
          '@/constants': path.resolve(__dirname, 'constants'),
        }
      },
      build: {
        target: 'esnext',
        minify: 'terser',
        sourcemap: true,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              ui: ['lucide-react', '@radix-ui/react-*'],
              supabase: ['@supabase/supabase-js'],
              reactQuery: ['@tanstack/react-query', '@tanstack/react-query-devtools']
            }
          }
        }
      },
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react-router-dom',
          '@supabase/supabase-js',
          '@tanstack/react-query'
        ]
      }
    };
});
