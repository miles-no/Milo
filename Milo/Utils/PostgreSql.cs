using Npgsql;

namespace Utils;

public static class PostgreSql
{
    private static readonly string _connectionString = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING") ?? string.Empty;
    
    public static List<DocumentSearchResult> VectorSimilaritySearch(float[] embeddings, int limit = 5, double tolerance = 0.86)
    {
        var results = new List<DocumentSearchResult>();
        try
        {
            using var conn = new NpgsqlConnection(_connectionString);
            conn.Open();
            
            using var command = new NpgsqlCommand();
            command.Connection = conn;
            command.CommandText =
                "SELECT d.id, d.content, d.source, 1 - (e.embedding <=> @embedding::vector) as similarity " +
                "FROM embeddings e " +
                "JOIN documents d ON e.document_id = d.id " +
                "WHERE 1 - (e.embedding <=> @embedding::vector) >= @tolerance " + // Filter in SQL
                "ORDER BY similarity DESC " +
                "LIMIT @limit";

            command.Parameters.AddWithValue("@embedding", embeddings);
            command.Parameters.AddWithValue("@limit", limit);
            command.Parameters.AddWithValue("@tolerance", tolerance);
            using var reader = command.ExecuteReader();
            
            while (reader.Read())
            {
                results.Add(new DocumentSearchResult
                {
                    Id = reader.GetInt32(0),
                    Content = reader.GetString(1),
                    Source = reader.GetString(2),
                    Similarity = reader.GetDouble(3)
                });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
        }

        return results;
    }
    
    public static void InsertEmbeddingAndDocument(string documents, string source, float[] embeddingArray)
    {
        try
        {
            using var conn = new NpgsqlConnection(_connectionString);
            conn.Open();
            using var transaction = conn.BeginTransaction();
            int documentId;

            using (var documentsCommand = new NpgsqlCommand())
            {
                documentsCommand.Connection = conn;
                documentsCommand.Transaction = transaction;
                documentsCommand.CommandText =
                    "INSERT INTO documents (content, source) VALUES (@content, @source) RETURNING id";

                documentsCommand.Parameters.AddWithValue("content", documents);
                documentsCommand.Parameters.AddWithValue("source", source);

                documentId = Convert.ToInt32(documentsCommand.ExecuteScalar());
            }

            // Second command - insert embedding 
            using (var embeddingsCommand = new NpgsqlCommand())
            {
                embeddingsCommand.Connection = conn;
                embeddingsCommand.Transaction = transaction;
                embeddingsCommand.CommandText =
                    "INSERT INTO embeddings (document_id, embedding) VALUES (@document_id, @embedding::vector)";

                embeddingsCommand.Parameters.AddWithValue("document_id", documentId);
                embeddingsCommand.Parameters.AddWithValue("embedding", embeddingArray);

                embeddingsCommand.ExecuteNonQuery();
            }
            transaction.Commit();
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
        }
    }
}