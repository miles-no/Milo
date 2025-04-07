from ollama import chat
from pydantic import BaseModel
import os
import time

class EmbeddingChunks(BaseModel):
    chunks: list[str]

def main():
    directory_path = "./RAG/data"
    documents, metadata = load_documents(directory_path)

    i = 0
    t3 = time.time()
    for _, document_text in enumerate(documents): 
        t1 = time.time()
        response = chat(
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant that chunks documents into smaller segments for embedding. You will receive a document and chunking parameters, and you will return the chunked data. Make sure to group each chunk into segments that makes sense for future querying. Make the chunks larger rather than smaller. Create the chunks in the same language as they originally are. "
            },
            {
                'role': 'user',
                'content': f"Please chunk the following document: {document_text}"
            }, 
        ],
        model="gemma3:27b",
        format=EmbeddingChunks.model_json_schema()
        )

        response = EmbeddingChunks.model_validate_json(response.message.content)
        t2 = time.time()
        cleaned_response = (str(response.chunks)
                            .replace('"', "'")
                            .replace('**"', "**'").replace('"**', "'**")
                            .replace('##"', "##'").replace('"##', "'##")
                            .replace("['", '["').replace("']", '"]')
                            .replace("',", '",').replace(", '", ', "'))
        
        print(f"Chunked response: {cleaned_response}")
        
        output_filename = os.path.join("./RAG/llm_chunked_data", f"{metadata[i]['filename']}").replace(".txt", ".json")
        i+=1
        
        # Create the output directory if it doesn't exist
        os.makedirs(os.path.dirname(output_filename), exist_ok=True)
        
        # Write the cleaned response to the file
        with open(output_filename, 'w', encoding='utf-8') as f:
            f.write(cleaned_response)
        # print(f"Saved chunks to: {output_filename}")
        print(f"Chunking took {t2 - t1:.2f} seconds")

    t4 = time.time()
    print(f"Total chunking time: {t4 - t3:.2f} seconds")


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
