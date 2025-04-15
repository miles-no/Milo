using Embeddings.Chunking;
using Utils;

namespace Embeddings;

internal static class Program
{
    public static async Task Main()
    {
        var handbookDocuments = HandbookDocuments.Retrieve();

        foreach (var documentData in handbookDocuments)
        {
            Console.WriteLine("Starting processing for document: " + documentData.Key);
            var llmChunking = new LLMChunking();
            var chunkData = await llmChunking.ChunkData(documentData.Value);
            Console.WriteLine($"Created {chunkData.Chunks.Count} chunks for document: {documentData.Key}");
            int i = 1;
            foreach (var chunk in chunkData.Chunks)
            {   
                Console.WriteLine($"Processing chunk {i}");
                i++;
                
                var embedding = await Utils.Embeddings.CreateVectorEmbedding(chunk);
                
                var vectorList = embedding.ToList();
                var embeddingVector = vectorList.First().Vector;
                var vectorArray = embeddingVector.ToArray();
                
                Console.WriteLine("Inserting chunk into database: " + chunk);
                PostgreSql.InsertEmbeddingAndDocument(chunk, documentData.Key, vectorArray);
            }
        }
    }
}