# 🤖 Milo - RAG with .NET and Ollama

Your friendly workspace buddy for Miles on Slack. Milo uses local AI models through Ollama and Retrieval Augmented Generation (RAG) to provide helpful responses while keeping your data private.

## Overview

This project demonstrates a complete RAG pipeline in .NET, integrated with Slack. Key features include:
- Setting up a PostgreSQL vector database for knowledge storage
- Generating embeddings from documents using local Ollama models
- Storing documents and their embeddings securely
- Retrieving relevant document chunks based on semantic search
- Using retrieved context to enhance LLM queries with Ollama
- Chatting with Milo directly in Slack by mentioning `@milo`
- Privacy-focused: all processing happens locally or within your controlled environment

## System Requirements

- .NET 9.0 SDK
- PostgreSQL 15+ with pgvector extension
- Ollama running locally with compatible models (embedding and generation models)
- (Optional) Slack Bot Token and App Token for Slack integration

## Project Structure

The solution consists of five main projects:

- **DBSetup**: Contains the `Program.cs` which executes SQL scripts to set up the PostgreSQL database schema, including enabling the `vector` extension and creating `documents` and `embeddings` tables with appropriate indexing.
- **Utils**: Provides shared utilities, including database connection helpers (`DatabaseHelper.cs`), Ollama client configuration (`OllamaClient.cs`), and potentially text processing functions used across other projects. Relies on `Npgsql` and `Microsoft.Extensions.AI` libraries.
- **Embeddings**: Reads documents (e.g., from `HandbookDocuments`), processes them into chunks, generates vector embeddings using the configured Ollama embedding model via `Utils`, and stores both the document content/source and the embeddings in the PostgreSQL database using `Utils`.
- **QueryOllama**: Takes a user query, generates an embedding for it, performs a semantic similarity search against the stored embeddings in PostgreSQL (using `pgvector`'s `<=>` operator), retrieves the top-k relevant document chunks, constructs a prompt including this context, sends the prompt to the configured Ollama generation model, and outputs the response.
- **SlackIntegration**: Implements a Slack bot using `SlackNet` (and potentially `Microsoft.Extensions.Hosting`). It listens for mentions (`@milo`), extracts the user's query, uses the logic from `QueryOllama` (or similar shared logic) to get a RAG-based answer, and posts the response back to the Slack channel. Handles configuration loading for Slack tokens and potentially Ollama/DB settings.

## Setup Instructions

### 1. Environment Variables

Set up the following environment variables. These are typically loaded using `Microsoft.Extensions.Configuration` within the applications. Default values might be provided in the code if variables are not set.

```bash
# PostgreSQL connection string (Required by DBSetup, Embeddings, QueryOllama, SlackIntegration)
export POSTGRES_CONNECTION_STRING="Host=localhost;Username=your_username;Password=your_password;Database=your_database"

# Ollama settings (Used by Embeddings, QueryOllama, SlackIntegration)
# Defaults: Endpoint=http://localhost:11434, Model=gemma3, EmbeddingModel=jeffh/intfloat-multilingual-e5-large-instruct:f16
export OLLAMA_ENDPOINT="http://localhost:11434"
export OLLAMA_MODEL="gemma3"
export OLLAMA_EMBEDDING_MODEL="jeffh/intfloat-multilingual-e5-large-instruct:f16"

# Slack settings (Required by SlackIntegration)
export SLACK_BOT_TOKEN="xoxb-your-bot-token"
export SLACK_APP_TOKEN="xapp-your-app-level-token"
```
*(Ensure your shell applies these exports, or configure them via launch settings, system environment variables, etc.)*

### 2. Database Setup

Ensure PostgreSQL is running and the `pgvector` extension is available. Then, run the DBSetup project:

```bash
cd Milo/DBSetup
dotnet run
```

This creates:
- A `documents` table (`id`, `content`, `source`)
- An `embeddings` table (`id`, `document_id`, `embedding VECTOR(1024)`)
- An IVFFlat index (`idx_embeddings`) on the `embedding` column for efficient similarity search.

### 3. Generate Embeddings

Place your text-based documents (e.g., `.md`, `.txt` files) in the `Milo/Embeddings/HandbookDocuments` directory. The `Embeddings` project will recursively scan this directory.

Run the Embeddings project:

```bash
cd Milo/Embeddings
dotnet run
```
This process will:
1. Find document files.
2. Read and chunk the content of each file.
3. For each chunk, call the Ollama API (via `OLLAMA_ENDPOINT`) to generate an embedding using `OLLAMA_EMBEDDING_MODEL`.
4. Store the document source, chunk content, and the generated embedding vector in the PostgreSQL database.

### 4. Query with Context

Run the QueryOllama project to ask questions using the RAG approach:

```bash
cd Milo/QueryOllama
dotnet run "Your question here?"
# Example: dotnet run "What is the process for requesting time off?"
```

You can provide your question as a command-line argument. The system performs the RAG steps: embedding the query, searching for similar chunks in the DB, creating a context-enhanced prompt, and querying the `OLLAMA_MODEL`.

### 5. Run Slack Integration (Optional)

To interact with the RAG system via Slack:

```bash
cd Milo/SlackIntegration
dotnet run
```

This starts the Slack bot. Ensure your bot is configured in Slack (App Manifest, OAuth scopes, Socket Mode enabled, Event Subscriptions for `app_mention`) and invited to relevant channels. Mention the bot (e.g., `@milo How do I reset my password?`) to get a response.

## How It Works

### 1. Vector Database with PostgreSQL and pgvector

The system leverages PostgreSQL with the `pgvector` extension:

- **Storage**: Stores `VECTOR` data type directly in the `embeddings` table. The dimension (e.g., 1024) is set during table creation, matching the output of the chosen embedding model.
- **Indexing**: Uses an `IVFFlat` index for Approximate Nearest Neighbor (ANN) search, significantly speeding up similarity queries compared to exact K-Nearest Neighbor (KNN) search on large datasets.
- **Similarity Search**: Employs the cosine distance operator (`<=>`) provided by `pgvector` to find embeddings (document chunks) most similar to the query embedding. The query typically looks for `1 - (embedding <=> queryEmbedding)` to get similarity scores (where 1 is most similar).

Database schema (simplified):
```sql
-- Ensure pgvector is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for original document source and content
CREATE TABLE documents (
    id SERIAL PRIMARY KEY, 
    content TEXT NOT NULL, 
    source TEXT -- e.g., filename or URL
);

-- Table for embeddings linked to document chunks
CREATE TABLE embeddings (
    id SERIAL PRIMARY KEY, 
    document_id INT REFERENCES documents(id) ON DELETE CASCADE, 
    embedding VECTOR(1024) -- Dimension matches the embedding model
);

-- Index for fast similarity search
CREATE INDEX idx_embeddings ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100); -- Adjust 'lists' based on dataset size
```

### 2. Document Processing and Chunking

The `Embeddings` project implements a basic chunking strategy:

- **Reading**: Reads text content from files.
- **Splitting**: Divides the text into smaller, potentially overlapping chunks. (The specific strategy, e.g., fixed size, sentence splitting, might need inspection in `Embeddings/Program.cs` or related classes).
- **Metadata**: Each chunk is associated with its original source document (`source` column in `documents` table).
- **Goal**: Chunks should be small enough for effective embedding but large enough to contain meaningful context.

### 3. Embedding Generation with Ollama

Vector embeddings are generated via the Ollama API:

- **Model**: Uses the model specified by `OLLAMA_EMBEDDING_MODEL` (e.g., `jeffh/intfloat-multilingual-e5-large-instruct:f16`).
- **Client**: Likely uses `HttpClient` and `System.Net.Http.Json` (or `Microsoft.Extensions.AI.Ollama`) to interact with the Ollama `/api/embeddings` endpoint.
- **Process**: Text chunks are sent to Ollama, which returns corresponding vector embeddings. These vectors are then stored in the `embeddings` table.

### 4. Semantic Search Implementation

The `QueryOllama` project (and `SlackIntegration`) performs semantic search:

- **Query Embedding**: The user's question is first converted into a vector embedding using the same `OLLAMA_EMBEDDING_MODEL`.
- **Database Query**: A SQL query is executed against the PostgreSQL database using `Npgsql`. It uses the `<=>` operator to find the `embeddings` with the smallest cosine distance to the query embedding.
- **Retrieval**: The `content` and `source` from the corresponding `documents` table for the top-k most similar embeddings are retrieved.

Example `Npgsql` query structure:
```csharp
// Assuming 'connection' is an NpgsqlConnection and 'queryEmbedding' is float[]
await using var cmd = new NpgsqlCommand(@"
    SELECT d.content, d.source, 1 - (e.embedding <=> @queryEmbedding) as similarity 
    FROM embeddings e 
    JOIN documents d ON e.document_id = d.id 
    ORDER BY e.embedding <=> @queryEmbedding 
    LIMIT @topK", connection);

cmd.Parameters.AddWithValue("queryEmbedding", queryEmbedding); 
cmd.Parameters.AddWithValue("topK", 5); // Example: Retrieve top 5 chunks

await using var reader = await cmd.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    // Process retrieved content, source, and similarity score
}
```

### 5. Context-Enhanced LLM Queries

The retrieved document chunks provide context for the final query to the LLM:

- **Prompt Construction**: A prompt is dynamically created, typically including:
    - System instructions (e.g., "Answer the user's question based *only* on the provided context. Cite sources if possible.")
    - The retrieved context chunks (formatted clearly).
    - The original user question.
- **LLM Interaction**: The combined prompt is sent to the Ollama generation model (`OLLAMA_MODEL`, e.g., `gemma3`) via its `/api/generate` or `/api/chat` endpoint.
- **Response Generation**: The LLM generates an answer based on the user's question and the provided context.

### 6. Slack Integration

The `SlackIntegration` project bridges the RAG pipeline with Slack:

- **Framework**: Uses `SlackNet` for handling Slack API interactions (Events API, Web API) via Socket Mode or HTTP.
- **Event Handling**: Listens for `app_mention` events.
- **Workflow**:
    1. Receives mention event.
    2. Extracts the user's text query from the event payload.
    3. Invokes the RAG logic (embedding, search, context prompt, LLM query).
    4. Posts the final LLM response back to the originating Slack channel/thread using `SlackNet`'s `api.Chat.PostMessage`.
- **Configuration**: Loads `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` from environment variables or other configuration sources.

## Key Technologies & Libraries

- **.NET 9**: Core framework.
- **PostgreSQL**: Relational database.
- **pgvector**: PostgreSQL extension for vector similarity search.
- **Ollama**: Local inference server for running LLMs and embedding models.
- **Npgsql**: .NET data provider for PostgreSQL.
- **Microsoft.Extensions.AI**: Libraries potentially used for interacting with AI models (though direct `HttpClient` usage is also common).
- **Microsoft.Extensions.Configuration**: For managing settings (connection strings, API keys, model names).
- **Microsoft.Extensions.Hosting**: (Likely used in `SlackIntegration`) For running background services/bots.
- **System.Text.Json**: For JSON serialization/deserialization when interacting with Ollama API.
- **SlackNet**: .NET library for Slack API interaction.

## Available Ollama Models

Milo uses Ollama models for both embeddings and language generation. You can pull different models to experiment or use specialized ones.

Install additional models with:

```bash
ollama pull <model-name>
```

Some recommended models:

- `gemma3` (Default LLM model)
- `jeffh/intfloat-multilingual-e5-large-instruct:f16` (Default Embedding Model)
- `llama4`

Ensure the models you want to use are specified in your environment variables or the application configuration.

## Troubleshooting

- **DB Connection Issues**: Verify `POSTGRES_CONNECTION_STRING` is correct and accessible from where the application is running. Check PostgreSQL logs. Ensure the user has permissions on the database and tables.
- **pgvector Not Found**: Ensure the `pgvector` extension is installed in your PostgreSQL instance and enabled in the target database (`CREATE EXTENSION IF NOT EXISTS vector;`).
- **Ollama Connection Issues**: Verify `OLLAMA_ENDPOINT` is correct and Ollama is running and accessible. Check firewall rules. Test the endpoint directly (e.g., `curl http://localhost:11434/api/tags`). Ensure the specified `OLLAMA_MODEL` and `OLLAMA_EMBEDDING_MODEL` are pulled (`ollama list`).
- **Slack Integration Errors**: Double-check `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN`. Ensure the bot has the correct OAuth scopes (e.g., `app_mentions:read`, `chat:write`). Verify Socket Mode is enabled in Slack app settings if used. Check Slack API dashboard for errors.
- **Embedding Dimension Mismatch**: Ensure the `VECTOR(dimension)` size in the `embeddings` table schema matches the output dimension of the `OLLAMA_EMBEDDING_MODEL`. If you change the model, you may need to recreate the table and re-embed documents.

## Extensibility

- **Document Loaders**: Modify `Embeddings/Program.cs` to support different file types (PDF, DOCX) by adding relevant parsing libraries (e.g., `PdfPig`, `DocumentFormat.OpenXml`).
- **Chunking Strategies**: Experiment with different text splitting methods (e.g., recursive character splitting, semantic chunking) in the `Embeddings` project.
- **Vector Databases**: Replace PostgreSQL/pgvector with another vector store (e.g., ChromaDB, Qdrant, Weaviate) by updating the data access logic in `Utils` and dependent projects.
- **Models**: Change `OLLAMA_MODEL` or `OLLAMA_EMBEDDING_MODEL` environment variables to use different Ollama models. Ensure compatibility (e.g., embedding dimensions).
- **LLM Providers**: Adapt the code in `QueryOllama` and `Utils` to call different LLM APIs (e.g., OpenAI, Anthropic) instead of Ollama.

## Privacy & Security

Milo processes all queries and document embeddings locally using Ollama and your PostgreSQL database, ensuring your conversations and data stay private and secure within your infrastructure.

## Contributing

Issues and pull requests are welcome! Feel free to contribute to make Milo even better.

## License

*(Consider adding a license file (e.g., LICENSE.txt with MIT, Apache 2.0) and referencing it here)*
This project is licensed under the [Your License Name] License - see the LICENSE.txt file for details.