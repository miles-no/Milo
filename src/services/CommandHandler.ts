import { ChatPostMessageResponse } from '@slack/web-api';
import { OllamaService } from './ollama.js';

export class CommandHandler {
    constructor(private ollama: OllamaService) { }

    async handleCommand(command: string, userId: string, channelId: string, threadTs: string, client: any): Promise<boolean> {
        if (command === 'list models') {
            await this.listModels(userId, channelId, threadTs, client);
            return true;
        }

        if (command.startsWith('use model ')) {
            await this.switchModel(command, userId, channelId, threadTs, client);
            return true;
        }

        if (command === 'reset model') {
            await this.resetModel(userId, channelId, threadTs, client);
            return true;
        }

        if (command === 'help' || command === 'commands') {
            await this.showHelp(userId, channelId, threadTs, client);
            return true;
        }

        return false;
    }

    private async listModels(userId: string, channelId: string, threadTs: string, client: any): Promise<void> {
        const models = await this.ollama.listModels();
        const currentModel = this.ollama.getUserModel(userId);
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: threadTs,
            text: `Current model: ${currentModel}\n\nAvailable models:\n${models.map(m => `• ${m}`).join('\n')}`
        });
    }

    private async switchModel(command: string, userId: string, channelId: string, threadTs: string, client: any): Promise<void> {
        const modelName = command.replace('use model ', '').trim();
        const models = await this.ollama.listModels();

        if (!models.includes(modelName)) {
            await client.chat.postMessage({
                channel: channelId,
                thread_ts: threadTs,
                text: `❌ Model "${modelName}" not found. Available models:\n${models.map(m => `• ${m}`).join('\n')}`
            });
            return;
        }

        this.ollama.setUserModel(userId, modelName);
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: threadTs,
            text: `✅ Switched to model: ${modelName}`
        });
    }

    private async resetModel(userId: string, channelId: string, threadTs: string, client: any): Promise<void> {
        this.ollama.resetUserModel(userId);
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: threadTs,
            text: `✅ Reset to default model: ${this.ollama.getUserModel(userId)}`
        });
    }

    private async showHelp(userId: string, channelId: string, threadTs: string, client: any): Promise<void> {
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: threadTs,
            text: `👋 Hello <@${userId}>! I can:\n` +
                `• Respond to mentions with \`@milo\`\n` +
                `• Watch for reactions\n` +
                `• \`list models\` - Show available AI models\n` +
                `• \`use model <name>\` - Switch to a different model\n` +
                `• \`reset model\` - Reset to the default model`
        });
    }
}
