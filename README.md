# 🤖 Milo - RAG with .NET and Ollama

Your friendly workspace buddy for Miles on Slack. Milo uses local AI models through Ollama and Retrieval Augmented Generation (RAG) to provide helpful responses while keeping your data private.

## Overview

This project demonstrates a complete RAG pipeline in .NET, integrated with Slack. Key features include:
- Setting up a PostgreSQL vector database for knowledge storage
- Generating embeddings from documents using local Ollama models
- Storing documents and their embeddings securely
- Retrieving relevant document chunks based on semantic search
- Using retrieved context to enhance LLM queries with Ollama
- 💬 Chatting with Milo directly in Slack by mentioning `@milo`
- 🔒 Privacy-focused: all processing happens locally or within your controlled environment

## System Requirements

- .NET 9.0 SDK
- PostgreSQL 15+ with pgvector extension
- Ollama running locally with compatible models

## Project Structure

The solution consists of five main projects:

- **DBSetup**: Sets up the PostgreSQL database schema for vector storage
- **Utils**: Common utilities shared across projects
- **Embeddings**: Processes documents, generates embeddings, and stores them in the database
- **QueryOllama**: Performs semantic search and sends queries to Ollama with context
- **SlackIntegration**: Integrates the RAG functionality with Slack for interactive querying

## Setup Instructions

### 1. Environment Variables

Set up the following environment variables:

```bash
# PostgreSQL connection string
export POSTGRES_CONNECTION_STRING="Host=localhost;Username=your_username;Password=your_password;Database=your_database"

# Ollama settings (optional, defaults provided in code)
export OLLAMA_ENDPOINT="http://localhost:11434"
export OLLAMA_MODEL="llama3"
export OLLAMA_EMBEDDING_MODEL="nomic-embed-text"

# Slack settings
export SLACK_BOT_TOKEN="xoxb-your-bot-token"
export SLACK_APP_TOKEN="xapp-your-app-level-token"
```

### 2. Database Setup

Run the DBSetup project to create the necessary database schema:

```bash
cd MiloRag/DBSetup
dotnet run
```

This creates:
- A `documents` table for storing text content and sources
- An `embeddings` table with vector data linked to documents
- Vector indexing for efficient similarity search

### 3. Generate Embeddings

Place your documents in the `Embeddings/HandbookDocuments` directory (or modify the code to point to your documents).

Run the Embeddings project to process and store documents:

```bash
cd MiloRag/Embeddings
dotnet run
```

### 4. Query with Context

Run the QueryOllama project to ask questions using the RAG approach:

```bash
cd MiloRag/QueryOllama
dotnet run "Your question here?"
```

You can provide your question as a command-line argument, and the system will:
1. Convert your question to an embedding
2. Find the most semantically relevant document chunks
3. Include these chunks as context when querying the LLM
4. Return the LLM's response

### 5. Run Slack Integration (Optional)

To interact with the RAG system via Slack:

```bash
cd MiloRag/SlackIntegration
dotnet run
```

This will start the Slack bot, allowing users to query the system from Slack channels.

## How It Works

### 1. Vector Database with PostgreSQL and pgvector

The system uses PostgreSQL with the pgvector extension for efficient vector storage and similarity search:

- **pgvector Extension**: Enables storage and indexing of high-dimensional vector data directly within PostgreSQL
- **IVFFlat Indexing**: Uses Inverted File with Flat quantization for fast approximate nearest neighbor search
- **Vector Dimensions**: Supports 1024-dimensional embeddings from models like nomic-embed-text
- **Cosine Similarity**: Used as the distance metric for semantic relevance

Database schema:
```sql
CREATE TABLE documents (id SERIAL PRIMARY KEY, content TEXT, source TEXT);
CREATE TABLE embeddings (id SERIAL PRIMARY KEY, document_id INT REFERENCES documents(id), embedding VECTOR(1024));
CREATE INDEX idx_embeddings ON embeddings USING ivfflat (embedding);
```

### 2. Document Processing and Chunking

Documents are processed with a chunking strategy:

- **Text Splitting**: Large documents are broken into manageable chunks
- **Metadata Preservation**: Each chunk maintains reference to its source document
- **Size Balancing**: Chunks are sized to balance context preservation with embedding quality

### 3. Embedding Generation with Ollama

Text is converted to vector embeddings using Ollama's embedding models:

- **Embedding Model**: Uses nomic-embed-text (1024 dimensions) by default
- **API Integration**: Uses .NET's Microsoft.Extensions.AI libraries for Ollama integration
- **Vector Storage**: Embeddings are stored in PostgreSQL using the pgvector extension

### 4. Semantic Search Implementation

Query processing involves:

- **Query Embedding**: Converting user questions to the same vector space as documents
- **Similarity Search**: Finding document chunks with highest cosine similarity to the query
- **K-Nearest Neighbors**: Retrieving top-k most similar documents (configurable)

PostgreSQL query example:
```sql
SELECT d.content, d.source, 1 - (e.embedding <=> @queryEmbedding) as similarity 
FROM embeddings e 
JOIN documents d ON e.document_id = d.id 
ORDER BY e.embedding <=> @queryEmbedding LIMIT @topK;
```

### 5. Context-Enhanced LLM Queries

The system enhances LLM prompts with retrieved context:

- **Prompt Engineering**: Uses templates that include retrieved context
- **System Instructions**: Provides clear instructions to the LLM on how to use the context
- **Source Attribution**: Encourages the LLM to cite sources when providing information

### 6. Slack Integration

The `SlackIntegration` project allows users to interact with the RAG system through Slack:

- **Event Handling**: Listens for messages mentioning the bot in Slack channels.
- **Query Processing**: Extracts user questions from Slack messages.
- **RAG Pipeline Invocation**: Uses the `QueryOllama` logic to perform semantic search and generate context-enhanced LLM queries.
- **Response Delivery**: Sends the LLM's response back to the originating Slack channel.
- **Real-time Interaction**: Provides a conversational interface to the knowledge base.

## Available Ollama Models

Milo uses Ollama models for both embeddings and language generation. You can pull different models to experiment or use specialized ones.

Install additional models with:

```bash
ollama pull <model-name>
```

Some recommended models:

- `gemma3`
- `jeffh/intfloat-multilingual-e5-large-instruct:f16` (Default Embedding Model)
- `llama4`
- `mistral`
- `neural-chat`

Ensure the models you want to use are specified in your environment variables or the application configuration.

## Privacy & Security

Milo processes all queries and document embeddings locally using Ollama and your PostgreSQL database, ensuring your conversations and data stay private and secure within your infrastructure.

## Contributing

Issues and pull requests are welcome! Feel free to contribute to make Milo even better.