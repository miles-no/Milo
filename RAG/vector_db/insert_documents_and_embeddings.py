import json
import psycopg2
import torch
from psycopg2.extras import execute_values


def store_documents_and_embeddings(connection_string, chunked_data, embeddings, metadata_list):
    """Store documents and embeddings in PostgreSQL"""
    conn = psycopg2.connect(connection_string)
    cursor = conn.cursor()
    
    # Insert documents first
    document_data = [(content, json.dumps(metadata)) for content, metadata in zip(chunked_data, metadata_list)]
    
    # Insert documents and get their IDs
    document_ids = []
    for content, metadata_json in document_data:
        cursor.execute(
            "INSERT INTO documents (content, metadata) VALUES (%s, %s) RETURNING id",
            (content, metadata_json)
        )
        document_ids.append(cursor.fetchone()[0])
    
    # Convert embeddings to list format if they're tensors
    embedding_data = []
    for i, emb in enumerate(embeddings):
        # Convert from tensor if needed
        if isinstance(emb, torch.Tensor):
            emb = emb.cpu().numpy()
        
        # Convert to Python list for database storage
        embedding_data.append((document_ids[i], emb.tolist()))
    
    # Insert embeddings with document IDs
    execute_values(
        cursor,
        "INSERT INTO embeddings (document_id, embedding) VALUES %s",
        embedding_data,
        template="(%s, %s::vector)"
    )
    
    conn.commit()
    cursor.close()
    conn.close()
    print(f"Stored {len(chunked_data)} chunks with embeddings.")
    return document_ids