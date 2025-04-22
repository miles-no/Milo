using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SlackNet.Blocks;
using SlackNet.Events;
using SlackNet.Extensions.DependencyInjection;
using SlackIntegration;

Console.WriteLine("Configuring...");

var configuration = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json")
    .AddUserSecrets<Program>()
    .Build();

var serviceCollection = new ServiceCollection();

serviceCollection.AddSingleton<IConfiguration>(configuration);
var settings = configuration.Get<AppSettings>();
serviceCollection.AddSingleton(settings);

serviceCollection.AddSlackNet(c => c
    .UseApiToken(settings.ApiToken) // This gets used by the API client
    .UseAppLevelToken(settings.AppLevelToken) // This gets used by the socket mode client
    .RegisterEventHandler<MessageEvent, MiloMentionHandler>()
    .RegisterSlashCommandHandler<SlashCommandHandler>(SlashCommandHandler.AskCommand)

);
var services = serviceCollection.BuildServiceProvider();

Console.WriteLine("Connecting...");

var client = services.SlackServices().GetSocketModeClient();
await client.Connect();

Console.WriteLine("Connected. Press any key to exit...");
await Task.Run(Console.ReadKey);

record AppSettings
{
    public string ApiToken { get; init; } = string.Empty;
    public string AppLevelToken { get; init; } = string.Empty;
}