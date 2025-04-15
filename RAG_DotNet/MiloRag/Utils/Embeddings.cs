using Microsoft.Extensions.AI;

namespace Utils;


public static class Embeddings
{
    private static readonly string? OllamaBaseUrl = Environment.GetEnvironmentVariable("OLLAMA_BASE_URL");
    private static readonly string? EmbeddingModel = Environment.GetEnvironmentVariable("EMBEDDING_MODEL");
    
    /// <summary>
    /// Converts a string to a vector embedding using the Ollama API.
    /// </summary>
    /// <param name="content"></param>
    /// <returns></returns>
    /// <exception cref="ArgumentNullException"></exception>
    public static async Task<GeneratedEmbeddings<Embedding<float>>> CreateVectorEmbedding(string content)
    {
        var embeddingGenerator = new OllamaEmbeddingGenerator(new Uri(OllamaBaseUrl ?? throw new ArgumentNullException(OllamaBaseUrl)), EmbeddingModel);
        var textToEmbed = new List<string> { content };

        var embedding = new GeneratedEmbeddings<Embedding<float>>();
        
        try
        {
            embedding = await embeddingGenerator.GenerateAsync(textToEmbed);
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
        }

        return embedding;
    }
    
    public static float[] ConvertEmbeddingListToArray(GeneratedEmbeddings<Embedding<float>> embedding)
    {
        var vectorList = embedding.ToList();
        var embeddingVector = vectorList.First().Vector;
        var vectorArray = embeddingVector.ToArray();
        
        return vectorArray;
    }
}