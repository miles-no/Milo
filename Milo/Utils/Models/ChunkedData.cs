using System.Text.Json.Serialization;

namespace Utils;

public class ChunkedData
{
    [JsonPropertyName("chunks")]
    public List<string> Chunks { get; set; } = [];
}