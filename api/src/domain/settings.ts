import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { SiteSettings, UpdateSettingsRequest } from '@grasi/shared';
import { DEFAULT_BANNER_MESSAGE } from '@grasi/shared';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key } from '../lib/keys.js';

// Until launch, the banner defaults to ON so visitors know the business isn't live yet.
const DEFAULTS: SiteSettings = {
  bannerEnabled: true,
  bannerMessage: DEFAULT_BANNER_MESSAGE,
};

export async function getSettings(): Promise<SiteSettings> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: key.siteSettings() }));
  if (!res.Item) return DEFAULTS;
  return {
    bannerEnabled: (res.Item.bannerEnabled as boolean | undefined) ?? DEFAULTS.bannerEnabled,
    bannerMessage: (res.Item.bannerMessage as string | undefined) ?? DEFAULTS.bannerMessage,
  };
}

export async function updateSettings(patch: UpdateSettingsRequest): Promise<SiteSettings> {
  const next: SiteSettings = { ...(await getSettings()), ...patch };
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { ...key.siteSettings(), entity: 'SETTINGS', ...next },
    }),
  );
  return next;
}
