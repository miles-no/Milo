using System.Text.Json;
using SlackNet;
using SlackNet.Events;
using SlackNet.WebApi;
using Utils;

namespace SlackIntegration;

/// <summary>
/// A message handler that responds to messages mentioning Milo. Or messages sent directly to Milo.
/// </summary>
internal class MiloMentionHandler(ISlackApiClient slack) : IEventHandler<MessageEvent>
{
    private const string MiloUserId = "U08GZTK3W5S";
    
    private const string ChannelTypeChannel = "channel";
    private const string ChannelTypeIm = "im";
    
    public async Task Handle(MessageEvent slackEvent)
    {
        // Ignore messages from the bot itself
        if (slackEvent.User == MiloUserId)
        {
            Console.WriteLine($"Received message from Milo: {slackEvent.Text}");
            return;
        }
        
        // Handle messages that mention Milo
        if (slackEvent.Text.Contains(MiloUserId) && slackEvent.ChannelType == ChannelTypeChannel)
        {
            await HandleDirectMessageWithRag(slackEvent);
        }
        
        // Handle direct messages to Milo
        if (slackEvent.ChannelType == ChannelTypeIm)
        {
            await HandleDirectMessageWithRag(slackEvent);
        }

    }

    private async Task HandleDirectMessageWithRag(MessageEvent slackEvent)
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
    }
}