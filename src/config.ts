import { readFileSync } from 'node:fs';
import packageJson from '../package.json';

function readEnvSync(name: string): string {
  try {
    // Docker secret
    const secretPath = process.env[`${name}_FILE`];
    return readFileSync(secretPath ?? '', 'utf8');
  } catch (_error) {
    const env = process.env[name];
    if (!env) {
      console.error(`${name} is undefined`);
      process.exit(1);
    }
    return env;
  }
}

const config = {
  // App
  NODE_ENV: readEnvSync('NODE_ENV') as
    | 'development'
    | 'production',
  APP_NAME: readEnvSync('APP_NAME'),
  APP_TIMEZONE: readEnvSync('APP_TIMEZONE'),
  APP_LOCALE: readEnvSync('APP_LOCALE'),
  APP_HOST: readEnvSync('APP_HOST'),
  APP_PORT: Number.parseInt(readEnvSync('APP_PORT')),
  CORS_ALLOWED_ORIGINS: readEnvSync('CORS_ALLOWED_ORIGINS')
    .split(',')
    .map((x) => x.trim()),

  // Database
  DATABASE_HOST: readEnvSync('DATABASE_HOST'),
  DATABASE_PORT: Number.parseInt(
    readEnvSync('DATABASE_PORT'),
  ),
  DATABASE_USER: readEnvSync('DATABASE_USER'),
  DATABASE_PASSWORD: readEnvSync('DATABASE_PASSWORD'),
  DATABASE_NAME: readEnvSync('DATABASE_NAME'),
  DATABASE_CONNECTION_LIMIT: Number.parseInt(
    readEnvSync('DATABASE_CONNECTION_LIMIT'),
  ),

  // JWT
  TOKEN_SECRET_KEY: readEnvSync('TOKEN_SECRET_KEY'),
  REFRESH_TOKEN_SECRET_KEY: readEnvSync(
    'REFRESH_TOKEN_SECRET_KEY',
  ),
  TOKEN_EXPIRES_IN_MINUTES: Number.parseInt(
    readEnvSync('TOKEN_EXPIRES_IN_MINUTES'),
  ),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: Number.parseInt(
    readEnvSync('REFRESH_TOKEN_EXPIRES_IN_DAYS'),
  ),
};

// Validate config
const validNodeEnvs = ['production', 'development'];

if (!validNodeEnvs.includes(config.NODE_ENV)) {
  console.error(`Invalid NODE_ENV: ${config.NODE_ENV}`);
  process.exit(1);
}

console.info(
  `${config.APP_NAME} # Bun: v${Bun.version} - env: ${config.NODE_ENV} - version: v${packageJson.version}`,
);

export default config;
