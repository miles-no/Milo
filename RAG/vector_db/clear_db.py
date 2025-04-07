import psycopg2

connection_string = "postgresql://vector_user:vector_password@localhost:5432/vector_db"

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
    clear_db(connection_string)