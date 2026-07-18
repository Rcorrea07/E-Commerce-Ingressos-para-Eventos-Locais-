import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AuthService } from '../src/auth/auth.service.js';
import { createApp, createOpenApiDocument } from '../src/bootstrap.js';

const app = await createApp();
await app.init();
const application = createOpenApiDocument(app);
const authentication = await app.get(AuthService).auth.api.generateOpenAPISchema();
await writeFile(resolve('../docs/openapi.json'), `${JSON.stringify(application, null, 2)}\n`);
await writeFile(resolve('../docs/auth-openapi.json'), `${JSON.stringify(authentication, null, 2)}\n`);
await app.close();
