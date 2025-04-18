import ollama
import json
import psycopg2
import torch
from sentence_transformers import SentenceTransformer
import argparse
import re
import os
from dotenv import load_dotenv

def create_query_embedding(query, model):
    """Generate embedding for a query"""
    embedding = model.encode([query], convert_to_tensor=True, normalize_embeddings=True)
    
    # Move tensor to CPU before any numpy operations
    if hasattr(embedding, 'device') and str(embedding.device).startswith('mps'):
        embedding = embedding.cpu()
    
    return embedding[0]  # Return the first (and only) embedding

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
        similarity DESC
    LIMIT %s;
    """, (query_embedding_list, top_k))
    
    results = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    # Format results
    formatted_results = []
    for doc_id, content, metadata_json, similarity in results:
        # Handle metadata - it might be a dict or a JSON string
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

def format_norwegian_context_for_llm(results):
    """Format the retrieved documents into a context string for the LLM"""

    context = ""
        
    for i, result in enumerate(results):
        kilde = str(result['metadata']["filename"]).replace(".txt", "").replace(".json", "").replace(".md", "")
        context += f'Kilde: "{kilde}" (Relevans: {result['similarity']:.1f}%):\n'
        context += f"{result['content']}\n\n"
    
    return context


def format_english_context_for_llm(results):
    """Format the retrieved documents into a context string for the LLM"""

    for i, result in enumerate(results):
        context += f"Document {i+1} (Relevance: {result['similarity']:.1f}%):\n"
        context += f"{result['content']}\n\n"
    
    return context


def query_ollama_with_rag(user_query, model_name, connection_string, similarity_threshold=70, language='no'):
    """Query Ollama with RAG using PostgreSQL vector search"""

    # Load the embedding model
    print("Loading embedding model...")
    embedding_model = SentenceTransformer('intfloat/multilingual-e5-large-instruct')
    
    # Create an embedding for the query
    print("Creating query embedding...")
    query_embedding = create_query_embedding(user_query, embedding_model)

    # Search for similar documents
    print("Searching for relevant documents...")
    results = search_similar_documents_db(connection_string, query_embedding)

    # Filter results by similarity threshold
    filtered_results = [r for r in results if r['similarity'] >= similarity_threshold]
    
    if filtered_results:
        print(f"Found {len(filtered_results)} relevant documents above the similarity threshold of {similarity_threshold}%")
    else:
        print(f"No documents found above the similarity threshold of {similarity_threshold}%. Using all retrieved documents.")
        filtered_results = results
    
    # Set the language for the context
    if language == 'no':
        # Format context for LLM in Norwegian
        context = format_norwegian_context_for_llm(filtered_results)
        prompt = f"""Du er en norsk AI-assistent som hjelper med å svare på spørsmål ved hjelp av gitt informasjon.
        Basert på følgende kontekstinformasjon:
        {context}
        Spørsmål: {user_query}
        Svar på spørsmålet basert på informasjonen gitt ovenfor, legg til dokumentet som kilde for informasjonen du gir. Et eksempel kan være Kilde: [navn-på-kilde]. Hvis svaret ikke finnes i konteksten,
        si at du ikke har nok informasjon til å besvare spørsmålet. Vær presis og konkret.
        """
    else:
        # Format context for LLM in English
        context = format_english_context_for_llm(filtered_results)
    
        # Create prompt for Ollama
        prompt = f"""You are an AI assistant that helps answer questions using the provided information.
        Based on the following context information:
        {context}
        Question: {user_query}
        Answer the question based on the information given above. If the answer is not found in the context,
        say that you do not have enough information to answer the question. Be precise and specific. Also, answer in the language the question is asked in.
        """
    
    # Query Ollama
    print(f"Querying Ollama with model: {model_name}...")
    response = ollama.chat(model=model_name, messages=[
        {
            'role': 'user',
            'content': prompt
        }
    ])
    
    # Regex that removes text that corresponds to "(Relevanse: xx.x%)" in the response
    cleaned_response = re.sub(r'\(Relevans: \d+\.\d+%\)', '', response['message']['content'])

    return {
        'query': user_query,
        'answer': cleaned_response,
        'context': filtered_results
    }

def main():
    load_dotenv()
    connection_string = os.getenv("POSTGRES_CONNECTION_STRING")
    parser = argparse.ArgumentParser(description='Query Ollama with RAG using vector database')
    parser.add_argument('query', type=str, help='The question to ask')
    parser.add_argument('--model', type=str, default='gemma3', help='Ollama model to use (default: gemma3)')
    parser.add_argument('--threshold', type=float, default=80.0, 
                        help='Similarity threshold for document relevance (0-100)')
    
    args = parser.parse_args()
    
    # Query Ollama with RAG
    result = query_ollama_with_rag(
        user_query=args.query,
        model_name=args.model,
        connection_string=connection_string,
        similarity_threshold=args.threshold
    )
    
    # Print answer
    print("\n" + "="*80)
    print("Answer:")
    print(result['answer'])
    print("="*80)
    
    
if __name__ == "__main__":
    main()