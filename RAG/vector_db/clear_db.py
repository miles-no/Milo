import psycopg2
import os
from dotenv import load_dotenv

def clear_db(connection_string):
    """Set up PostgreSQL with pgvector tables"""
    conn = psycopg2.connect(connection_string)
    cursor = conn.cursor()
    
    print("Clearing database for data...")

    cursor.execute("delete from embeddings")
    cursor.execute("delete from documents")

    conn.commit()
    cursor.close()
    conn.close()
    print("Database cleared for data.")

if __name__ == "__main__":
    load_dotenv()
    connection_string = os.getenv("POSTGRES_CONNECTION_STRING")
    clear_db(connection_string)