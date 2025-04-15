from vector_db.insert_documents_and_embeddings import store_documents_and_embeddings, insert_document_data_and_embedding
from embedding.create_embeddings_from_text import chunk_text, create_embeddings
from sentence_transformers import SentenceTransformer
from vector_db.clear_db import clear_db
import json
import os
from dotenv import load_dotenv

load_dotenv()
connection_string = os.getenv("POSTGRES_CONNECTION_STRING")

def Embedd_And_Insert_LLM_Chunks():
    ## Only used during testing, it clears the database for data before insertion.
    clear_db(connection_string)

    documents, doc_metadata = LoadRagData("./RAG/llm_chunked_data")

    model = SentenceTransformer('intfloat/multilingual-e5-large-instruct')
    
    for i, doc in enumerate(documents):
        # Iterate through each item in the list from the document
        chunked_data = json.loads(doc)
        document_metadata = doc_metadata[i]
        
        for chunk in chunked_data:
            metadata_to_insert = document_metadata
            embedding = create_embeddings(chunk, model)

            # Insert the chunk and its embedding into the database
            insert_document_data_and_embedding(connection_string, chunk, embedding, metadata_to_insert)

        
def LoadRagData(directory_path):
    documents, doc_metadata = load_documents(directory_path)
    return documents, doc_metadata


def load_documents(directory_path):
    """Load documents from files in a directory"""
    documents = []
    metadata = []
    
    for root, _, files in os.walk(directory_path):
        for file in files:
            if file.endswith(('.txt', '.md', '.json')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    # Store document with metadata
                    documents.append(content)
                    metadata.append({
                        'source': file_path,
                        'filename': file,
                        'type': file.split('.')[-1]
                    })
                    print(f"Loaded: {file_path}")
                except Exception as e:
                    print(f"Error loading {file_path}: {e}")
    
    return documents, metadata

if __name__ == "__main__":
    # Embedd_And_Insert_500_Char_Chunks()
    Embedd_And_Insert_LLM_Chunks()