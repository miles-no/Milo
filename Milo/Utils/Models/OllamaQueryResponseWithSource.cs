using System.Text.Json.Serialization;

namespace Utils;

public class OllamaQueryResponseWithSource
{
    [JsonPropertyName("AnswersAndSource")]
    public Dictionary<string, string> AnswersAndSource { get; set; } = new();
    
}