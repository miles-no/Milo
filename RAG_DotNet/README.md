# MiloRag - Retrieval Augmented Generation with .NET

A .NET implementation of Retrieval Augmented Generation (RAG) using PostgreSQL vector database and Ollama for embeddings and LLM inferencing.

## Overview

This project demonstrates a complete RAG pipeline in .NET, including:
- Setting up a PostgreSQL vector database
- Generating embeddings from documents
- Storing documents and their embeddings in the database
- Retrieving relevant document chunks based on semantic search
- Using retrieved context in LLM queries with Ollama

## System Requirements

- .NET 9.0 SDK
- PostgreSQL 15+ with pgvector extension
- Ollama running locally with compatible models

## Project Structure

The solution consists of four main projects:

- **DBSetup**: Sets up the PostgreSQL database schema for vector storage
- **Utils**: Common utilities shared across projects
- **Embeddings**: Processes documents, generates embeddings, and stores them in the database
- **QueryOllama**: Performs semantic search and sends queries to Ollama with context

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