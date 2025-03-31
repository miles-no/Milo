import os
from embedding.create_embeddings_from_text import chunk_text, create_embeddings
from vector_db.insert_documents_and_embeddings import store_documents_and_embeddings
from sentence_transformers import SentenceTransformer


connection_string = "postgresql://vector_user:vector_password@localhost:5432/vector_db"

def main():
    documents, doc_metadata = LoadNewRagData()
    
    all_chunks = []
    all_metadata = []

    model = SentenceTransformer('intfloat/multilingual-e5-large-instruct')
    
    for i, doc in enumerate(documents):
        chunked_data, chunk_metadata = chunk_text(doc)
        
        for j, chunk in enumerate(chunked_data):
            all_chunks.append(chunk)
            
            # Combine document and chunk metadata
            combined_metadata = doc_metadata[i].copy()
            combined_metadata.update(chunk_metadata[j])
            all_metadata.append(combined_metadata)

            embeddings = create_embeddings(chunked_data, model)

        # Insert embeddings into database
        try:
            document_ids = store_documents_and_embeddings(
                connection_string,
                chunked_data,
                embeddings,
                all_metadata
            )
        except Exception as e:
            print(f"Error storing documents and embeddings: {e}")
            return
        

def LoadNewRagData():
    directory_path = "./RAG/data"  # Directory containing text files
    documents, doc_metadata = load_documents(directory_path)

    return documents, doc_metadata


def load_documents(directory_path):
    """Load documents from files in a directory"""
    documents = []
    metadata = []
    
    for root, _, files in os.walk(directory_path):
        for file in files:
            if file.endswith(('.txt', '.md', '.html')):
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
    main()




