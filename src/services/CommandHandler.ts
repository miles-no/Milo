import { WebClient } from '@slack/web-api';
import type { ConversationsRepliesResponse } from '@slack/web-api';
import { OllamaService } from './ollama.js';
import { GitHubService } from './GitHubService.js';

export class CommandHandler {
    private ollama: OllamaService;
    private github: GitHubService;

    constructor(ollama: OllamaService) {
        this.ollama = ollama;
        this.github = new GitHubService();
    }

    async handleCommand(command: string, userId: string, channelId: string, threadTs: string, client: WebClient): Promise<boolean> {
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

        if (command.startsWith('github')) {
            const text = command.replace('github', '').trim();
            await this.handleGitHubIssue(channelId, threadTs, text, client);
            return true;
        }

        return false;
    }

    private async listModels(userId: string, channelId: string, threadTs: string, client: WebClient): Promise<void> {
        const models = await this.ollama.listModels();
        const currentModel = this.ollama.getUserModel(userId);
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: threadTs,
            text: `Current model: ${currentModel}\n\nAvailable models:\n${models.map(m => `• ${m}`).join('\n')}`
        });
    }

    private async switchModel(command: string, userId: string, channelId: string, threadTs: string, client: WebClient): Promise<void> {
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

    private async resetModel(userId: string, channelId: string, threadTs: string, client: WebClient): Promise<void> {
        this.ollama.resetUserModel(userId);
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: threadTs,
            text: `✅ Reset to default model: ${this.ollama.getUserModel(userId)}`
        });
    }

    private async showHelp(userId: string, channelId: string, threadTs: string, client: WebClient): Promise<void> {
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: threadTs,
            text: `👋 Hello <@${userId}>! I can:\n` +
                `• Respond to mentions with \`@milo\`\n` +
                `• Watch for reactions\n` +
                `• \`list models\` - Show available AI models\n` +
                `• \`use model <name>\` - Switch to a different model\n` +
                `• \`reset model\` - Reset to the default model\n` +
                `• \`github\` (EXPERIMENTAL) - Create a GitHub issue from the current thread or previous message\n` +
                `• \`github <text>\` (EXPERIMENTAL) - Create a GitHub issue with the provided text`
        });
    }

    private async handleGitHubIssue(channelId: string, messageTs: string, customText: string, client: WebClient): Promise<void> {
        try {
            let content: string;
            let title: string;

            if (customText) {
                // Use provided text directly
                content = customText;
                title = customText.substring(0, 50);
            } else {
                // Try to get thread messages first
                const result = await client.conversations.replies({
                    channel: channelId,
                    ts: messageTs
                }) as ConversationsRepliesResponse;

                if (result.messages && result.messages.length > 1) {
                    // We're in a thread, use all messages
                    content = result.messages
                        .map(m => `${m.user}: ${m.text}`)
                        .join('\n');
                    title = result.messages[0]?.text?.substring(0, 50) ?? 'Thread discussion';
                } else {
                    // Not in a thread, get previous message
                    const history = await client.conversations.history({
                        channel: channelId,
                        latest: messageTs,
                        limit: 2,
                        inclusive: true
                    });

                    if (!history.messages || history.messages.length < 2) {
                        throw new Error('No previous message found');
                    }

                    const previousMessage = history.messages[1]; // Get the message before the command
                    content = previousMessage.text ?? '';
                    title = content.substring(0, 50);
                }
            }

            // Generate summary using Ollama
            const summary = await this.ollama.generateResponse(
                `Summarize this conversation and format it as a GitHub issue description:\n${content}`,
                'system'
            );

            // Create GitHub issue
            const issueUrl = await this.github.createIssue(
                `${title}...`,
                summary
            );

            // Reply with the issue link
            await client.chat.postMessage({
                channel: channelId,
                thread_ts: messageTs,
                text: `I've created a GitHub issue: ${issueUrl}`
            });

        } catch (error) {
            console.error('Error creating GitHub issue:', error instanceof Error ? error.message : 'Unknown error');
            await client.chat.postMessage({
                channel: channelId,
                thread_ts: messageTs,
                text: "Sorry, I encountered an error while creating the GitHub issue."
            });
        }
    }
}
