import { app } from './app';
import config from './config';
import { emitter } from './service/emitter';
import { websocketHandler } from './websocket';

const server = Bun.serve({
  hostname: config.APP_HOST,
  port: config.APP_PORT,
  fetch: app.fetch,
  websocket: websocketHandler,
});

emitter.on(
  'websocket:emit',
  (to: string, payload: Record<string, any>) => {
    server.publish(to, JSON.stringify(payload));
  },
);

console.log(
  `${config.APP_NAME} # server running at ${server.url}`,
);
