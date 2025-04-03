from ollama import chat
from pydantic import BaseModel
import os

class EmbeddingChunks(BaseModel):
    chunks: list[str]

def main():

    with open("./RAG/data/mobile-and-broadband.md", "r") as file:
        document_text = file.read()

    chunk_size_words = 500  
    overlap_words = 50      

    response = chat(
    messages=[
        {
            'role': 'user',
            'content': f"""I'm going to give you a document, please chunk the data into segments that seems most fitting together, and with sizes no larger than the given chunking parameters. The chunks will be embedded and put into a vector database for RAG operations.
            Input text: {document_text}
            Chunk size: {chunk_size_words}
            Chunk overlap count: {overlap_words}
            """
        }, 
    ],
    model='gemma3:4b',
    format=EmbeddingChunks.model_json_schema(),
    )

    response = EmbeddingChunks.model_validate_json(response.message.content)
    print(str(response.chunks).replace("'", '"'))




if __name__ == "__main__":
  main()