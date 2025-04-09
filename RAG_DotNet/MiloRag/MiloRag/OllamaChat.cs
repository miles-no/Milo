using Microsoft.Extensions.AI;

namespace MiloRag;

public class OllamaChat
{
    public async Task Chat()
    {
        IChatClient chatClient =
            new OllamaChatClient(new Uri("http://localhost:11434/"), "gemma3");

        // Start the conversation with context for the AI model
        List<ChatMessage> chatHistory = new();

        while (true)
        {
            // Get user prompt and add to chat history
            Console.WriteLine("Your prompt:");
            var userPrompt = Console.ReadLine();
            chatHistory.Add(new ChatMessage(ChatRole.User, userPrompt));

            // Stream the AI response and add to chat history
            Console.WriteLine("AI Response:");
            var response = "";
            await foreach (var item in
                           chatClient.GetStreamingResponseAsync(chatHistory))
            {
                Console.Write(item.Text);
                response += item.Text;
            }
            chatHistory.Add(new ChatMessage(ChatRole.Assistant, response));
            Console.WriteLine();
        }
    }
}