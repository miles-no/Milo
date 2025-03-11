import { WebClient } from '@slack/web-api';
import type { ConversationsRepliesResponse } from '@slack/web-api';
import { OllamaService } from './ollama.js';
import { GitHubService } from './GitHubService.js';
import { OracleService } from './OracleService.js';

export class CommandHandler {
    private ollama: OllamaService;
    private github: GitHubService;
    private oracle: OracleService;

    constructor(ollama: OllamaService) {
        this.ollama = ollama;
        this.github = new GitHubService();
        this.oracle = new OracleService();
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

        // If no command matched, treat as a general query
        const relevantDocs = this.oracle.findRelevantDocuments(command);
        if (relevantDocs) {
            const response = await this.ollama.generateResponse(
                command,
                userId,
                'documentBased',
                relevantDocs
            );

            await client.chat.postMessage({
                channel: channelId,
                thread_ts: threadTs,
                text: response
            });
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
                `• Respond to mentions with \`@milo\` - I'll try to help with your questions\n` +
                `• Answer questions about Miles documents and policies\n` +
                `• Watch for reactions\n` +
                `• \`list models\` - Show available AI models\n` +
                `• \`use model <name>\` - Switch to a different model\n` +
                `• \`reset model\` - Reset to the default model\n` +
                `• \`github\` (EXPERIMENTAL) - Create a GitHub issue from the current thread\n` +
                `• \`github <text>\` (EXPERIMENTAL) - Create a GitHub issue with custom text\n\n` +
                `📚 I have access to various Miles documents and can help answer questions about:\n` +
                `• Company equipment and ordering procedures\n` +
                `• More documents coming soon...`
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
                // Get thread messages
                const result = await client.conversations.replies({
                    channel: channelId,
                    ts: messageTs,
                    inclusive: true
                }) as ConversationsRepliesResponse;

                if (result.messages && result.messages.length > 0) {
                    // We're in a thread, use all messages
                    content = result.messages
                        .filter(m => m.text) // Filter out messages without text
                        .map(m => `${m.user}: ${m.text}`)
                        .join('\n');
                    title = result.messages[0]?.text?.substring(0, 50) ?? 'Thread discussion';
                } else {
                    throw new Error('No messages found in the thread');
                }
            }

            // Generate summary using Ollama with github template
            const summary = await this.ollama.generateResponse(
                content,
                'system',
                'github'
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
                text: "Sorry, I encountered an error while creating the GitHub issue. Make sure you're running this command in a thread or providing custom text."
            });
        }
    }
}
