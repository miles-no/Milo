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

interface PromptTemplate {
    system: string;
    user: string;
}

export class OllamaService {
    private baseUrl: string;
    private userPreferences: UserPreferences;

    private readonly SYSTEM_CONTEXT = `You are Milo, a friendly and helpful AI assistant for Miles employees. 
Some key points about your role:
- You are direct and concise in your responses
- You communicate in the same language as the user (Norwegian or English)
- You aim to be helpful while staying factual
- When you're unsure, you admit it and suggest asking a human
- You're familiar with Miles' values and culture
- You always base your answers on provided context when available`;

    private readonly PROMPT_TEMPLATES = {
        general: {
            system: this.SYSTEM_CONTEXT,
            user: "Question: {message}\nAnswer:"
        },
        documentBased: {
            system: `${this.SYSTEM_CONTEXT}\n\nAnswer based only on the following context. If the context doesn't contain relevant information, say so:\n{context}`,
            user: "Question: {message}\nAnswer:"
        },
        github: {
            system: "You are helping to create clear and concise GitHub issue descriptions. Format the summary professionally and include key points.",
            user: "Please summarize this conversation into a GitHub issue description:\n{message}"
        }
    };

    constructor(baseUrl: string = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
        this.userPreferences = new UserPreferences();
    }

    private formatPrompt(userMessage: string, type: keyof typeof this.PROMPT_TEMPLATES = 'general', context?: string): string {
        const template = this.PROMPT_TEMPLATES[type];
        const systemPrompt = template.system.replace('{context}', context || '');
        const userPrompt = template.user.replace('{message}', userMessage);

        return `<s>${systemPrompt}\n\n${userPrompt}</s>`;
    }

    async generateResponse(prompt: string, userId: string, type: keyof typeof this.PROMPT_TEMPLATES = 'general', context?: string): Promise<string> {
        try {
            const formattedPrompt = this.formatPrompt(prompt, type, context);
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
