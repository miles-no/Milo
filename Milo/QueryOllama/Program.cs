using System.Text.Json;
using Utils;

namespace QueryOllama;

internal static class Program
{
    public static async Task Main(string[] args)
    {
        await QueryOllamaJsonResponse(args);
    }

    private static async Task QueryOllamaJsonResponse(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Please provide a query.");
            return;
        }

        string query = args[0];

        var queryEmbeddings =
            await Embeddings.CreateVectorEmbedding(query ?? throw new ArgumentNullException(query));
        var vectorArray = Embeddings.ConvertEmbeddingListToArray(queryEmbeddings);

        var results = PostgreSql.VectorSimilaritySearch(vectorArray, 5);
        
        var options = new JsonSerializerOptions
        {
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping // Allows support for ø, æ, å
        };
        var resultString = JsonSerializer.Serialize(results, options);
        
        var ollamaSystemMessage = 
            $$"""
                 Du er en norsk AI-assistent med navn Milo som hjelper med å svare på spørsmål 
                 ved hjelp av gitt informasjon. Basert på følgende kontekst informasjon: 
                 {{resultString}}.
                 Svar på spørsmålet basert på informasjonen ovenfor. Legg til kilde.
                 Returner JSON som svar. Json skal se ut som {"kilde1.txt": "svar1", "kilde2.json": "svar2"}
                 Hvis du ikke finner et relevant svar i konteksten, returner JSON som {"ingen_kilde": "Beklager, jeg fant ikke et relevant svar i den gitte informasjonen."}.
              """;
        
        var ollama = new Ollama();
        var responseJson = await ollama.OllamaJsonResponse<OllamaQueryResponseWithSource>(query, ollamaSystemMessage, "gemma3:12b");

        var cleanedJsonResponse = string.Empty;

        foreach (var result in responseJson.AnswersAndSource)
        {
            if(result.Key == "ingen_kilde")
            {
                cleanedJsonResponse += $"{result.Value}\n";
                continue;
            }
            cleanedJsonResponse += $"{result.Value} Kilde: {result.Key}\n";
        }
        
        Console.WriteLine(cleanedJsonResponse);
    }
}