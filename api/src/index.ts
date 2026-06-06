import { handle } from 'hono/aws-lambda';
import { createApp } from './app.js';

/** AWS Lambda entry point (API Gateway HTTP API v2). Handler reference: `index.handler`. */
export const handler = handle(createApp());
