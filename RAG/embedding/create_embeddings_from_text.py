import os

def get_detailed_instruct(task_description: str, query: str) -> str:
    return f'Instruct: {task_description}\nQuery: {query}'


def chunk_text(text, chunk_size=500, overlap=50):
    """Split document into overlapping chunks"""
    chunks = []
    chunk_metadata = []
    
    # Simple chunking by character count
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        if end < len(text) and end - start == chunk_size:
            # Find the last period or space to avoid cutting sentences
            last_period = text[start:end].rfind('.')
            if last_period != -1 and last_period > chunk_size // 2:
                end = start + last_period + 1
            else:
                # Fall back to space if no good period found
                last_space = text[start:end].rfind(' ')
                if last_space != -1:
                    end = start + last_space + 1
        
        chunks.append(text[start:end])
        chunk_metadata.append({'chunk_start': start, 'chunk_end': end})
        start = end - overlap if end < len(text) else end
    
    print(f"Chunked {len(chunks)} chunks from document.")
    return chunks, chunk_metadata

def create_embeddings(texts, model):
    """Generate embeddings for a list of texts"""
    embeddings = model.encode(texts, convert_to_tensor=True, normalize_embeddings=True)
    
    # Move tensor to CPU before any numpy operations
    if hasattr(embeddings, 'device') and str(embeddings.device).startswith('mps'):
        embeddings = embeddings.cpu()
    
    return embeddings