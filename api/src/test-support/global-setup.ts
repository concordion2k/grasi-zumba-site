import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';
import type { GlobalSetupContext } from 'vitest/node';

/**
 * Vitest global setup for the API integration suite: boot a single DynamoDB Local container
 * (ephemeral, in-memory) for the whole run. The endpoint is handed to the test workers via Vitest's
 * `provide`/`inject` channel (more reliable than env across worker processes). Each test file then
 * creates its own uniquely-named table (see test-support/integration.ts) for per-route isolation.
 */
let container: StartedTestContainer | undefined;

export async function setup({ provide }: GlobalSetupContext): Promise<void> {
  container = await new GenericContainer('amazon/dynamodb-local:latest')
    .withExposedPorts(8000)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  const endpoint = `http://${container.getHost()}:${container.getMappedPort(8000)}`;
  provide('dynamoEndpoint', endpoint);
}

export async function teardown(): Promise<void> {
  await container?.stop();
}

declare module 'vitest' {
  export interface ProvidedContext {
    dynamoEndpoint: string;
  }
}
