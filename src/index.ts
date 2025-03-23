import express from 'express';
import OpenAI from 'openai';
import * as line from '@line/bot-sdk';
import dotenv from 'dotenv';
import { printLog, textEventHandler } from './utils';
dotenv.config();

const app = express();
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const lineChannelSecret = process.env.LINE_CHANNEL_SECRET;
if (!openrouterApiKey || !lineChannelAccessToken || !lineChannelSecret)
  throw new Error('Missing env variables');

const config = {
  channelSecret: lineChannelSecret,
};

app.post('/', line.middleware(config), async (req: any, res: any) => {
  if (!openrouterApiKey || !lineChannelAccessToken || !lineChannelSecret)
    return res.status(500).send('Missing env variables');

  console.info('Got webhook post request');
  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: openrouterApiKey,
  });

  const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: lineChannelAccessToken,
  });
  const events: line.WebhookEvent[] = await req.body.events;
  console.info('Line webhook events:', JSON.stringify(events));
  if (!events || events.length === 0) {
    return res.json({ message: 'No events' });
  }
  await Promise.all(
    events.map(async (event: line.WebhookEvent) => {
      try {
        await textEventHandler(client, event, openai);
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error(err);
        }
        return res.status(500);
      }
    }),
  );
  return res.status(200);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
