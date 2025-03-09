import dotenv from "dotenv";
import pkg from '@slack/bolt';
import { OllamaService } from './services/ollama';
const { App } = pkg;

dotenv.config();
console.log('Starting Milo...');

// Initialize your Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true, // Enable real-time event handling with Socket Mode to ease local development
  appToken: process.env.SLACK_APP_TOKEN
});

const ollama = new OllamaService();

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

// Messages that mention Milo
app.event('app_mention', async ({ event, say }) => {
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
    const question = event.text.replace(/<@[^>]+>/g, '').trim();

    // Get response from Ollama
    const response = await ollama.generateResponse(question);

    await say({
      text: response,
      thread_ts: event.ts
    });
  } catch (error) {
    console.error('❌ Error processing app mention:', error);
    await say({
      text: "Sorry, I encountered an error while processing your request.",
      thread_ts: event.ts
    });
  }
});

// Channel messages (excluding DMs since we don't have im:* scopes)
app.message(async ({ message, say }) => {
  try {
    if (message.subtype === 'bot_message' || !('text' in message) || !('user' in message)) return;

    const text = message.text ? message.text.toLowerCase().trim() : '';

    console.log('📩 Channel message:', {
      user: message.user,
      text: text,
      channel: message.channel,
      ts: message.ts
    });

    // Only respond to specific triggers in channels
    if (text.includes('hello milo')) {
      await say({
        text: `👋 Hello <@${message.user}>!`,
        thread_ts: message.ts
      });
    } else if (text.startsWith('milo:')) {
      const question = text.replace('milo:', '').trim();
      const response = await ollama.generateResponse(question);
      await say({
        text: response,
        thread_ts: message.ts
      });
    }
  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
});

(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
    console.log('Hello, Milo!');
    console.log('✅ Event listeners registered');
  } catch (error) {
    console.error('❌ Error starting app:', error);
    process.exit(1);
  }
})();

