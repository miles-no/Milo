# Miles RAG System

This folder contains a Retrieval-Augmented Generation (RAG) system that enhances Milo's responses by retrieving relevant information from a vector database of company documents.

## What is RAG?

RAG combines the power of:
- **Retrieval**: Finding relevant documents from a knowledge base
- **Generation**: Using an LLM to generate answers based on retrieved information

This helps Milo provide more accurate, factual answers about Miles-specific information.

## Prerequisites

- **Docker**: For running PostgreSQL with pgvector
- **Python 3.8+**: For running the embedding and query scripts
- **Ollama**: Local LLM service (https://ollama.ai)
- **Python packages**:
  - `sentence-transformers`: For creating document embeddings
  - `psycopg2`: For PostgreSQL connections
  - `torch`: For tensor operations
  - `ollama`: Python client for Ollama API

Install Python dependencies with:
```bash
pip install sentence-transformers psycopg2-binary torch ollama
```

## Setting up the environment

1. Start the PostgreSQL database with pgvector extension:
   ```bash
   docker-compose up -d
   ```

2. Set up the database schema:
   ```bash
   python3 RAG/vector_db/db_setup.py
   ```

3. Embed documents and insert them into the database:
   ```bash
   python3 RAG/Embedd_and_insert_data.py
   ```

## Querying the system

Once set up, you can query the system using the `Query_Ollama.py` script:

```bash
python3 RAG/Query_Ollama.py "What date is our salary paid each month?"
```

Additional query examples:

```bash
# Ask about mobile expenses
python3 RAG/Query_Ollama.py "Does Miles cover mobile expenses?"

# Ask about computer replacement
python3 RAG/Query_Ollama.py "How often can I replace my work computer?"

# Ask about ordering a new phone
python3 RAG/Query_Ollama.py "How do I order a new mobile phone?"
```

### Query parameters

You can customize queries with these optional parameters:

```bash
python3 RAG/Query_Ollama.py "Your question here" --model llama3.2:1b --threshold 60
```

- `--model`: Specify the Ollama model to use (default: llama3.2)
- `--threshold`: Similarity threshold from 0-100 (default: 70)
- `--connection`: Custom database connection string

## System components

- **Database**: PostgreSQL with pgvector extension for vector similarity search
- **Embedding model**: `intfloat/multilingual-e5-large-instruct` (1024-dimensional vectors)
- **Text processing**: Documents are chunked into smaller pieces with overlap
- **LLM generation**: Uses Ollama for final answer generation

## Adding new documents

To add new documents to the system:

1. Place your `.txt`, `.md`, or `.html` files in the `RAG/data` directory
2. Run the embedding script again:
   ```bash
   python3 RAG/Embedd_and_insert_data.py
   ```

## Troubleshooting

- **Database connection issues**: Ensure Docker is running and the container is up
- **Embedding errors**: Check that you have sufficient memory for the embedding model
- **Ollama errors**: Make sure Ollama is running (`ollama serve`)
- **No relevant results**: Try lowering the similarity threshold with `--threshold`

## Architecture

The system follows this process:
1. User query is embedded using the same model as documents
2. Vector similarity search finds relevant document chunks
3. Retrieved chunks are formatted into context
4. Ollama LLM generates an answer based on the context and query