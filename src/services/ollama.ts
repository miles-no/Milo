import { UserPreferences } from "./UserPreferences.js";

interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_duration?: number;
    eval_duration?: number;
}

interface OllamaError {
    error: string;
}

export class OllamaService {
    private baseUrl: string;
    private userPreferences: UserPreferences;

    constructor(baseUrl: string = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
        this.userPreferences = new UserPreferences();
    }

    private formatPrompt(userMessage: string): string {
        return `You are Milo, a friendly and helpful AI assistant in Slack. 
Keep responses concise and friendly.
Question: ${userMessage}
Answer:`;
    }

    async generateResponse(prompt: string, userId: string): Promise<string> {
        try {
            const formattedPrompt = this.formatPrompt(prompt);
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.userPreferences.getUserModel(userId),
                    prompt: formattedPrompt,
                    stream: false,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json() as OllamaError;
                throw new Error(`Ollama API error: ${errorData.error}`);
            }

            const data = await response.json() as OllamaResponse;
            return data.response;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to generate response: ${error.message}`);
            }
            throw new Error('Unknown error occurred while generating response');
        }
    }

    async listModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);

            if (!response.ok) {
                const errorData = await response.json() as OllamaError;
                throw new Error(`Ollama API error: ${errorData.error}`);
            }

            const data = await response.json() as { models: Array<{ name: string }> };
            return data.models.map(model => model.name);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to list models: ${error.message}`);
            }
            throw new Error('Unknown error occurred while listing models');
        }
    }

    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }

    setUserModel(userId: string, model: string): void {
        this.userPreferences.setUserModel(userId, model);
    }

    getUserModel(userId: string): string {
        return this.userPreferences.getUserModel(userId);
    }

    resetUserModel(userId: string): void {
        this.userPreferences.resetUserModel(userId);
    }
}
