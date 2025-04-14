using System.Text.Json;
using Microsoft.Extensions.AI;

namespace Utils.Ollama;

public class Ollama
{
    private readonly string? _ollamaBaseUrl = Environment.GetEnvironmentVariable("OLLAMA_BASE_URL");

    /// <summary>
    /// Allows you to send a message to Ollama, and get a response back in text format.
    /// </summary>
    /// <param name="model"></param>
    /// <param name="userMessage"></param>
    /// <param name="systemMessage"></param>
    /// <returns></returns>
    /// <exception cref="ArgumentNullException"></exception>
    public async Task<string> OllamaChatResponse(string userMessage, string systemMessage, string model = "gemma3")
    {
        var chatClient = new OllamaChatClient(new Uri(_ollamaBaseUrl ?? throw new ArgumentNullException(_ollamaBaseUrl)), model);
        var chatHistory = new List<ChatMessage>
        {
            new(ChatRole.System, systemMessage),
            new(ChatRole.User, userMessage)
        };

        var chatOptions = new ChatOptions
        {
            ResponseFormat = ChatResponseFormat.Text
        };

        var response = await chatClient.GetResponseAsync(chatHistory, chatOptions);
        
        return response.Text;
    }
    
    
    /// <summary>
    /// Allows you to send a message to Ollama, and get a response back in JSON format based on a class.
    /// </summary>
    /// <param name="model"></param>
    /// <param name="userMessage"></param>
    /// <param name="systemMessage"></param>
    /// <typeparam name="T"></typeparam>
    /// <returns></returns>
    /// 
    public async Task<T> OllamaJsonResponse<T>(string model, string userMessage, string systemMessage)
        where T : class, new()
    {
        var chatClient = new OllamaChatClient(new Uri(_ollamaBaseUrl ?? "http://localhost:11434/"), model);
        var chatHistory = new List<ChatMessage>
        {
            new(ChatRole.System, systemMessage),
            new(ChatRole.User, userMessage)
        };

        var schemaJson = JsonSerializer.Serialize(typeof(T).GenerateJsonSchema());
        var schemaElement = JsonSerializer.Deserialize<JsonElement>(schemaJson);
        
        var chatOptions = new ChatOptions
        {
            ResponseFormat = new ChatResponseFormatJson(schemaElement)
        };

        var response = await chatClient.GetResponseAsync(chatHistory, chatOptions);

        return JsonSerializer.Deserialize<T>(response.Text) ?? new T();
    }
}