using Utils;
using Utils.Ollama;

namespace Embeddings.Chunking;

public class LLMChunking
{
    public async Task<ChunkedData> ChunkData(string document)
    {
        var systemMessage = "Du er en hjelpsom assistent som deler dokumenter inn i mindre segmenter for embedding. " +
                               "Du vil motta et dokument og parametere for oppdeling, og du vil returnere de oppdelte dataene. " +
                               "Pass på å gruppere hvert segment på en måte som gir mening for fremtidige spørringer. " +
                               "Lag segmentene større heller enn mindre. " + 
                               "Lag segmentene på samme språk som de opprinnelig er skrevet på.";        
        
        
        var userMessage = "Vennligst del opp følgende dokument i segmenter: " + document;
        
        var ollama = new Ollama();
        return await ollama.OllamaJsonResponse<ChunkedData>("gemma3", userMessage, systemMessage);
    }
}