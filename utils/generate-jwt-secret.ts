import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

function modifyEnvLine(envName: string, newValue: string) {
	if (!existsSync('./.env')) {
		copyFileSync('./.env.example', './.env');
	}

	const envData = readFileSync('./.env', 'utf8');

	const updatedEnvData = envData
		.split('\n')
		.map((line) => {
			if (line.startsWith(`${envName}=`)) {
				return `${envName}="${newValue}"`;
			}
			return line;
		})
		.join('\n');

	writeFileSync('./.env', updatedEnvData, 'utf8');
}

modifyEnvLine('USER_TOKEN_SECRET_KEY', randomBytes(32).toString('base64'));
modifyEnvLine(
	'USER_REFRESH_TOKEN_SECRET_KEY',
	randomBytes(32).toString('base64'),
);

// biome-ignore lint/suspicious/noConsole: <explanation>
console.log('Done!');
