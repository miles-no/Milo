using Microsoft.Extensions.AI;

namespace MiloRag;

public class Embeddings
{
    public async Task<GeneratedEmbeddings<Embedding<float>>> CreateVectorEmbedding(string content, string metadata)
    {
        var embeddingGenerator = new OllamaEmbeddingGenerator(new Uri("http://localhost:11434/"), "jeffh/intfloat-multilingual-e5-large-instruct:f16");

        var textToEmbed = new[] { content };
        
        var embedding = await embeddingGenerator.GenerateAsync(textToEmbed);

        return embedding;
    }
}