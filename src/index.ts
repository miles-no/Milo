import dotenv from "dotenv";
import pkg from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { OllamaService } from "./services/ollama.js";
import { CommandHandler } from "./services/CommandHandler.js";
const { App } = pkg;

dotenv.config();
console.log('Starting Milo...');

// Initialize your Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: !!process.env.SOCKET_MODE,
  appToken: process.env.SLACK_APP_TOKEN
});

const ollama = new OllamaService();
const commandHandler = new CommandHandler(ollama);

// Debug middleware to log all incoming events
app.use(async ({ logger, context, next }) => {
  console.log('⚡ Incoming event:', context.eventType);
  await next();
});

// Handle reaction added events
app.event('reaction_added', async ({ event, client }) => {
  try {
    console.log('⭐ Reaction added:', {
      reaction: event.reaction,
      user: event.user,
      item: event.item
    });
  } catch (error) {
    console.error('❌ Error processing reaction:', error);
  }
});

async function handleUserMessage(text: string, userId: string, channelId: string, messageTs: string, client: WebClient) {
  // Check if it's a command
  const isCommand = await commandHandler.handleCommand(text, userId, channelId, messageTs, client);
  if (isCommand) return;

  // Add reaction to original message
  await client.reactions.add({
    channel: channelId,
    timestamp: messageTs,
    name: 'thinking_face'
  });

  // Get and send response
  const response = await ollama.generateResponse(text, userId);
  await client.chat.postMessage({
    channel: channelId,
    thread_ts: messageTs,
    text: response
  });

  // Remove reaction
  await client.reactions.remove({
    channel: channelId,
    timestamp: messageTs,
    name: 'thinking_face'
  });

}

// Messages that mention Milo
app.event('app_mention', async ({ event, client }) => {
  try {
    console.log('📣 App mention event triggered');
    if (event.subtype === 'bot_message') return;

    console.log('📩 App mention received:', {
      user: event.user,
      text: event.text,
      channel: event.channel,
      ts: event.ts
    });

    // Extract the actual question (remove the bot mention)
    const question = event.text.replace(/<@[^>]+>/g, '').trim().toLowerCase();

    if (event.user) {
      await handleUserMessage(
        question,
        event.user,
        event.channel,
        event.ts,
        client as WebClient
      );
    } else {
      throw new Error('User ID is undefined');
    }
  } catch (error) {
    console.error('❌ Error processing app mention:', error);
    try {
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: "Sorry, I encountered an error while processing your request."
      });
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }
});

(async () => {
  try {
    // Check Ollama health and model availability
    const isHealthy = await ollama.checkHealth();
    if (!isHealthy) {
      throw new Error('Ollama is not running. Please start Ollama first.');
    }

    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Milo is running!');
  } catch (error) {
    console.error('❌ Error starting app:', error);
    process.exit(1);
  }
})();

