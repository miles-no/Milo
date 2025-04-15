import psycopg2
import os
from dotenv import load_dotenv


def setup_db(connection_string):
    """Set up PostgreSQL with pgvector tables"""
    conn = psycopg2.connect(connection_string)
    cursor = conn.cursor()
    
    # Enable pgvector extension
    cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    print("pgvector extension enabled.")

    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        source TEXT NOT NULL
    );
    """)
    print("Documents table created.")

    # Get the dimension of your embedding model
    # E5-large creates 1024-dimensional vectors
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS embeddings (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id),
        embedding vector(1024)
    );
    """)
    print("Embeddings table created.")

    # Create index for vector similarity search
    try:
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS embeddings_vector_idx 
        ON embeddings USING ivfflat (embedding vector_cosine_ops);
        """)
    except Exception as e:
        print(f"Note: Index creation requires data. Will create after data insertion: {e}")
    
    conn.commit()
    cursor.close()
    conn.close()
    print("Database setup complete.")


if __name__ == "__main__":
    load_dotenv()
    # Load environment variables
    connection_string = os.getenv("POSTGRES_CONNECTION_STRING")
    setup_db(connection_string)