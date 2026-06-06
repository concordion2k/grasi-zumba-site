import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { env } from '../env.js';

const baseClient = new DynamoDBClient({
  region: env.region,
  ...(env.dynamoEndpoint ? { endpoint: env.dynamoEndpoint } : {}),
});

/** Document client with sensible marshalling defaults. */
export const ddb = DynamoDBDocumentClient.from(baseClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

export const TABLE = env.tableName;
