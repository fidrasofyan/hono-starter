import { EventEmitter } from 'node:events';

class AppEmitter extends EventEmitter {}
export const emitter = new AppEmitter();

emitter.on('error', (err) => {
  console.error(err);
});
