using Npgsql;

namespace DBSetup;

internal static class Program
{
    private static readonly string ConnectionString = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING") ??
                                                       throw new ArgumentNullException($"POSTGRES_CONNECTION_STRING");
    
    public static void Main()
    {
        Console.WriteLine("Setting up PostgreSQL database for vector embeddings...");
        using var conn = new NpgsqlConnection(ConnectionString);
        conn.Open();

        using var transaction = conn.BeginTransaction();
        try
        {
            Console.WriteLine("Creating vector extension...");
            conn.ExecuteNonQuery("CREATE EXTENSION IF NOT EXISTS vector");
            
            Console.WriteLine("Creating documents table...");
            conn.ExecuteNonQuery(
                "CREATE TABLE IF NOT EXISTS documents (id SERIAL PRIMARY KEY, content TEXT, source TEXT)");
            
            Console.WriteLine("Creating embeddings table...");
            conn.ExecuteNonQuery("CREATE TABLE IF NOT EXISTS embeddings (id SERIAL PRIMARY KEY, " +
                                 "document_id INT REFERENCES documents(id), embedding VECTOR(1024))");
            
            Console.WriteLine("Creating indexes table...");
            conn.ExecuteNonQuery("CREATE INDEX IF NOT EXISTS idx_embeddings ON embeddings USING ivfflat (embedding)");
            
            Console.WriteLine("Committing transaction...");
            transaction.Commit();
            
            Console.WriteLine("PostgreSQL setup completed successfully.");
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
            transaction.Rollback();
        }
    }
}

public static class PostgresExtensions
{

    public static void ExecuteNonQuery(this NpgsqlConnection conn, string sqlQuery)
    {
        using var cmd = new NpgsqlCommand(sqlQuery, conn);
        cmd.ExecuteNonQuery();
    }
}