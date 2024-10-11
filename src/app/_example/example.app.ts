import { Hono } from 'hono';

const exampleApp = new Hono();

// Example
exampleApp.get('/example', (c) => {
  return c.json({ message: 'Example' }, 200);
});

export { exampleApp };
