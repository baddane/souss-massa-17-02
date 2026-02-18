import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    // Fusionner les vars fichiers (.env.local) ET les vars runtime (Vercel/CI)
    // Les vars fichiers ont la priorité sur les vars runtime
    const mergedEnv = {
      ...env,
      GEMINI_API_KEY: env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
      VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
      VITE_SUPABASE_OFFERS_URL: env.VITE_SUPABASE_OFFERS_URL || process.env.VITE_SUPABASE_OFFERS_URL || '',
      VITE_SUPABASE_OFFERS_ANON_KEY: env.VITE_SUPABASE_OFFERS_ANON_KEY || process.env.VITE_SUPABASE_OFFERS_ANON_KEY || '',
    };

    return {
      server: {
        port: 3001,
        host: true,
        open: true
      },
      plugins: [react()],
      define: {
        'process.env': JSON.stringify(mergedEnv),
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
              supabase: ['@supabase/supabase-js'],
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
        ]
      }
    };
});
