import { emitter } from '@/service/emitter';

export function websocketEmitToUser(data: {
  userId: number;
  event: string;
  payload: Record<string, any>;
}) {
  emitter.emit('websocket:emit', `user:${data.userId}`, {
    event: data.event,
    data: data.payload,
    timestamp: Date.now(),
  });
}
