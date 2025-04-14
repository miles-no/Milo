using System.Text.Json;
using Utils;
using Utils.Ollama;

namespace QueryOllama;

internal static class Program
{
    public static async Task Main(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Please provide a query.");
            return;
        }
        string query = args[0];

        var queryEmbeddings = await Utils.Embeddings.CreateVectorEmbedding(query ?? throw new ArgumentNullException(query));
        var vectorArray = Utils.Embeddings.ConvertEmbeddingListToArray(queryEmbeddings);
        
        var results = PostgreSql.VectorySimiliarySearch(vectorArray, 5);
        var options = new JsonSerializerOptions
        {
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };
        var resultString = JsonSerializer.Serialize(results, options);
        
        var ollamaSystemMessage = $"""
                                   Du er en norsk AI-assistent som hjelper med å svare på spørsmål 
                                   ved hjelp av gitt informasjon. Basert på følgende kontekst informasjon,
                                   {resultString}
                                   Svar på spørsmålet basert på informasjonen ovenfor. Legg til dokumentnavnet som kilde 
                                   for informasjonen du gir, legg den til på slutten av hver setning. 
                                   Et eksempel på kilde kan være "Kilde: [navn-på-kilde].
                                   Hvis varet ikke finnes i konteksten, si "Beklager, jeg har ikke informasjon om dette." 
                                   Hvis det ikke er informaIkke legg med kilde i dette tilfellet.
                                   """;
        
        
        var ollama = new Ollama();
        var response = await ollama.OllamaChatResponse(query, ollamaSystemMessage);
        Console.WriteLine(response);
    }
}