# 🤖 Milo

Your friendly workspace buddy for Miles on Slack. Milo uses local AI models through Ollama to provide helpful responses while keeping your data private.

## Features

- 💬 Chat with Milo by mentioning `@milo`
- 🔄 Switch between different AI models on the fly
- 🚀 Fast responses using local models
- 🔒 Privacy-focused: all processing happens locally

## Commands

- `@milo help` - Show available commands
- `@milo list models` - Show available AI models
- `@milo use model <name>` - Switch to a different model
- `@milo reset model` - Reset to the default model (llama3.2:1b)

You can also use these commands in channels by prefixing with `milo:` (e.g., `milo: help`)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Install Ollama:

   ```bash
   # macOS
   brew install ollama
   ```

3. Pull the default model:

   ```bash
   ollama pull llama3.2:1b
   ```

4. Create a `.env` file:

   ```env
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_SIGNING_SECRET=your-signing-secret
   SLACK_APP_TOKEN=xapp-your-app-token
   ```

5. Start Ollama:

   ```bash
   ollama serve
   ```

6. Start Milo:

   ```bash
   npm start
   ```

## Available Models

Milo uses Ollama models. Install additional models with:

```bash
ollama pull <model-name>
```

Some recommended models:

- llama3.2:1b (default)
- codellama
- mistral
- neural-chat

## Development

Built with:

- TypeScript
- Slack Bolt Framework
- Ollama API

## Privacy & Security

Milo processes all queries locally using Ollama, ensuring your conversations stay private and secure.

## Contributing

Issues and pull requests are welcome! Feel free to contribute to make Milo even better.
