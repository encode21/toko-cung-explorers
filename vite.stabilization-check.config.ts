import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({plugins:[react(),tailwind()],resolve:{alias:[{find:'@/integrations/supabase/client',replacement:path.resolve('src/stabilization-mock.ts')},{find:'@',replacement:path.resolve('src')}]},server:{port:8083,host:'127.0.0.1'}});
