import dotenv from "dotenv";
import pkg from '@slack/bolt';
import { OllamaService } from "./services/ollama.js";
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
    const question = event.text.replace(/<@[^>]+>/g, '').trim().toLowerCase();

    // Handle commands
    if (question === 'list models') {
      const models = await ollama.listModels();
      const currentModel = ollama.getUserModel(event.user || '');
      await say({
        text: `Current model: ${currentModel}\n\nAvailable models:\n${models.map(m => `• ${m}`).join('\n')}`,
        thread_ts: event.ts
      });
      return;
    }

    if (question.startsWith('use model ')) {
      const modelName = question.replace('use model ', '').trim();
      const models = await ollama.listModels();

      if (!models.includes(modelName)) {
        await say({
          text: `❌ Model "${modelName}" not found. Available models:\n${models.map(m => `• ${m}`).join('\n')}`,
          thread_ts: event.ts
        });
        return;
      }

      if (event.user) {
        ollama.setUserModel(event.user, modelName);
      } else {
        console.error('❌ Error: event.user is undefined');
      }
      await say({
        text: `✅ Switched to model: ${modelName}`,
        thread_ts: event.ts
      });
      return;
    }

    if (question === 'reset model') {
      if (event.user) {
        ollama.resetUserModel(event.user);
      } else {
        console.error('❌ Error: event.user is undefined');
      }
      await say({
        text: `✅ Reset to default model: ${ollama.getUserModel(event.user || '')}`,
        thread_ts: event.ts
      });
      return;
    }

    if (question === 'help' || question === 'commands') {
      await say({
        text: `👋 Hello <@${event.user}>! I can:\n` +
          `• Respond to mentions\n` +
          `• Watch for reactions\n` +
          `• Reply in channels when you start with "milo:"\n` +
          `• \`list models\` - Show available AI models\n` +
          `• \`use model <name>\` - Switch to a different model\n` +
          `• \`reset model\` - Reset to the default model`,
        thread_ts: event.ts
      });
      return;
    }

    // Regular question handling
    const response = await ollama.generateResponse(question, event.user || '');
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

