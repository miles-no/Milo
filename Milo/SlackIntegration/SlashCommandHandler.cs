using System.Text.Json;
using SlackNet.Interaction;
using SlackNet.WebApi;
using Utils;

namespace SlackIntegration;

/// <summary>
/// A slash handler that responds to any enabled slash commands.
/// </summary>
internal class SlashCommandHandler : ISlashCommandHandler
{
    public const string AskCommand = "/ask";

    public async Task<SlashCommandResponse> Handle(SlashCommand command)
    {
        
        switch (command.Command)
        {
            case "/ask":
                return new SlashCommandResponse
                {
                    Message = new Message
                    {
                        Text = await HandleAskCommand(command.Text)
                    }
                };
            default:
                // Slack only allows predefined slash commands to be run.
                // If the default is reached, it means there is a sync error between the code and slack configuration.
                return new SlashCommandResponse
                {
                    Message = new Message
                    {
                        Text = $"The command {command.Command} is invalid. Please check configuration and try again."
                    }
                };
        }
    }

    public async Task<string> HandleAskCommand(string queryText)
    {
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
        return response;
    }
}