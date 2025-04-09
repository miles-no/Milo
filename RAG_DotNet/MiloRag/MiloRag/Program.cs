namespace MiloRag;

internal static class Program
{
    public static async Task Main(string[] args)
    {
        
        
        var vectorEmbeddings = new Embeddings();
        var generatedEmbeddings = await vectorEmbeddings.CreateVectorEmbedding("some text to embed", "metadata");
        var vectorList = generatedEmbeddings.ToList();
        
        var postgresConnector = new PostgresConnector();
        postgresConnector.InsertEmbeddingAndDocument("some data", "{\"test\": \"data\"}", vectorList);
        
        var ollamaChat = new OllamaChat();
        await ollamaChat.Chat();
    }
}