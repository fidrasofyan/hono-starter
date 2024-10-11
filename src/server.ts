import { app } from './app';
import config from './config';

const httpServer = Bun.serve({
	hostname: config.APP_HOST,
	port: config.APP_PORT,
	fetch: app.fetch,
});

// biome-ignore lint/suspicious/noConsole: <explanation>
console.log(`${config.APP_NAME} # server running at ${httpServer.url}`);
