using System.Text.Json;
using Microsoft.Extensions.AI;

namespace Utils;

public class Ollama
{
    private readonly string? _ollamaBaseUrl = Environment.GetEnvironmentVariable("OLLAMA_BASE_URL");
    
    public static string CreateDefaultSystemMessageNo(string resultString) => $"""
                                                   Du er en norsk AI-assistent som hjelper med å svare på spørsmål 
                                                   ved hjelp av gitt informasjon. Basert på følgende kontekst informasjon,
                                                   {resultString}
                                                   Svar på spørsmålet basert på informasjonen ovenfor. Legg til dokumentnavnet som kilde 
                                                   for informasjonen du gir, legg den til på slutten av hver setning. 
                                                   Et eksempel på kilde kan være "Kilde: [navn-på-kilde].
                                                   Hvis varet ikke finnes i konteksten, si "Beklager, jeg har ikke informasjon om dette." 
                                                   Hvis det ikke er informasjon. Ikke legg med kilde i dette tilfellet.
                                                   """;
    
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
    public async Task<T> OllamaJsonResponse<T>(string userMessage, string systemMessage, string model = "gemma3:27b")
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