import fs from 'fs';
import path from 'path';
import * as line from '@line/bot-sdk';
import OpenAI from 'openai';

import dotenv from 'dotenv';
dotenv.config();

export const printLog = (msg: string, type: 'error' | 'info'): void => {
  const message = `[${new Date().toLocaleString()}] ${msg}`;
  const logFileDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(logFileDir)) {
    fs.mkdirSync(logFileDir, { recursive: true });
  }
  const logFilePath = path.join(logFileDir, 'log.txt');

  fs.appendFileSync(logFilePath, message + '\n', 'utf8');
  switch (type) {
    case 'error':
      console.error(message);
      break;
    case 'info':
      console.info(message);
      break;
    default:
      console.log(message);
      break;
  }
};

export const textEventHandler = async (
  client: line.messagingApi.MessagingApiClient,
  event: line.WebhookEvent,
  openai: OpenAI,
): Promise<line.MessageAPIResponseBase | undefined> => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }

  const { replyToken, message: { text } = {} } = event;
  console.info(JSON.stringify({ text }));
  const targetLanguage = ['jp-', 'cn-'].find((prefix) =>
    text?.startsWith(prefix),
  );
  console.info(JSON.stringify({ targetLanguage }));
  if (!targetLanguage) {
    return;
  }
  const completion = await openai.chat.completions.create({
    // model: 'deepseek/deepseek-r1:free',
    model: 'deepseek/deepseek-chat:free',
    messages: [
      {
        role: 'user',
        content: `請將以下內容單純的翻譯成${
          targetLanguage === 'jp-' ? '日文' : '繁體中文'
        }，不用解釋細節: \n${text?.slice(3)}`,
      },
    ],
  });
  console.info(JSON.stringify(completion.choices[0].message));
  const response: line.TextMessage = {
    type: 'text',
    // text: `請翻以下內容成繁體中文：${text}`,
    text: `${completion.choices[0].message.content}`,
  };

  const replyMessageRequest: line.messagingApi.ReplyMessageRequest = {
    replyToken: replyToken,
    messages: [response],
  };

  await client.replyMessage(replyMessageRequest);
};
