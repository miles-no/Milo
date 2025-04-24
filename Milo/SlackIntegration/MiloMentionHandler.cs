using System.Text.Json;
using SlackNet;
using SlackNet.Events;
using SlackNet.WebApi;
using Utils;

namespace SlackIntegration;

/// <summary>
/// A message handler that responds to messages mentioning Milo.
/// </summary>
internal class MiloMentionHandler(ISlackApiClient slack) : IEventHandler<MessageEvent>
{
    private const string MiloUserId = "<@U08GZTK3W5S>";

    public async Task Handle(MessageEvent slackEvent)
    {
        // Ignore messages from the bot itself
        if (slackEvent.User == MiloUserId )
        {
            Console.WriteLine($"Received message from Milo: {slackEvent.Text}");
            return;
        }
        
        
        if (slackEvent.Text.Contains(MiloUserId))
        {
            var queryText = slackEvent.Text.Substring(MiloUserId.Length);
            var queryEmbeddings = await Embeddings.CreateVectorEmbedding(queryText);

            var vectorArray = Embeddings.ConvertEmbeddingListToArray(queryEmbeddings);
            var results = PostgreSql.VectorSimilaritySearch(vectorArray);

            var options = new JsonSerializerOptions
            {
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
            };

            var resultString = JsonSerializer.Serialize(results, options);
            var ollamaSystemMessage = Ollama.CreateDefaultSystemMessageNo(resultString);
            
            var ollama = new Ollama();
            
            var response = await ollama.OllamaChatResponse(queryText, ollamaSystemMessage);
            await slack.Chat.PostMessage(new Message
            {
                Text = response,
                Channel = slackEvent.Channel
            });

            Console.WriteLine($"Received message from {slackEvent.User}: {slackEvent.Text}");
        }
    }
}