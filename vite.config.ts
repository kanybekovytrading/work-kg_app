import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Добавь этот импорт

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')

	return {
		server: {
			port: 3000,
			host: '0.0.0.0',
			allowedHosts: true,
		},
		plugins: [react()],
		define: {
			'process.env.VITE_GEMINI_API_KEY': JSON.stringify(
				env.VITE_GEMINI_API_KEY,
			),
		},
		resolve: {
			// ВЕРНИ ЭТОТ БЛОК:
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
		build: {
			outDir: 'dist',
			emptyOutDir: true,
		},
	}
})
export {}

declare global {
	interface Window {
		Telegram: {
			WebApp: any // Можно заменить на WebApp из пакета типов, если нужно
		}
	}
}
