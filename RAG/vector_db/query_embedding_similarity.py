import psycopg2
import json
import torch

def search_similar_documents_db(connection_string, query_embedding, top_k=5):
    """Search for similar documents in PostgreSQL using vector similarity"""
    conn = psycopg2.connect(connection_string)
    cursor = conn.cursor()
    
    # Convert embedding to list if it's a tensor
    if isinstance(query_embedding, torch.Tensor):
        query_embedding = query_embedding.cpu().numpy()
    
    # Convert numpy array to Python list
    query_embedding_list = query_embedding.tolist()
    
    # Query for similar documents using cosine distance with explicit casting
    cursor.execute("""
    SELECT 
        d.id, 
        d.content, 
        d.metadata,
        1 - (e.embedding <=> %s::vector) AS similarity
    FROM 
        embeddings e
    JOIN 
        documents d ON e.document_id = d.id
    ORDER BY 
        e.embedding <=> %s::vector
    LIMIT %s;
    """, (query_embedding_list, query_embedding_list, top_k))
    
    results = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    # Format results
    formatted_results = []
    for doc_id, content, metadata_json, similarity in results:
        # Check if metadata_json is already a dict or needs parsing
        if isinstance(metadata_json, str):
            metadata = json.loads(metadata_json)
        else:
            metadata = metadata_json
            
        formatted_results.append({
            'id': doc_id,
            'content': content,
            'metadata': metadata,
            'similarity': float(similarity * 100)  # Convert to percentage
        })
    
    return formatted_results