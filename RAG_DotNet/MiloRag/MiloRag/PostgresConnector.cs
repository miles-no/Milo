using Microsoft.Extensions.AI;
using Npgsql;

namespace MiloRag;
public class PostgresConnector
{
    public void InsertEmbeddingAndDocument(string documents, string metadata, List<Embedding<float>>? embeddings)
    {
        var connectionString = Environment.GetEnvironmentVariable("POSTGRES_CONN_STRING");
        try
        {
            using (var conn = new NpgsqlConnection(connectionString))
            {
                conn.Open();
                using (var transaction = conn.BeginTransaction())
                {
                    int documentId;

                    using (var documentsCommand = new NpgsqlCommand())
                    {
                        documentsCommand.Connection = conn;
                        documentsCommand.Transaction = transaction;
                        documentsCommand.CommandText =
                            "INSERT INTO documents (content, metadata) VALUES (@content, @metadata::jsonb) RETURNING id";

                        documentsCommand.Parameters.AddWithValue("content", documents);
                        documentsCommand.Parameters.AddWithValue("metadata", metadata);

                        documentId = Convert.ToInt32(documentsCommand.ExecuteScalar());
                    }

                    // Second command - insert embedding 
                    using (var embeddingsCommand = new NpgsqlCommand())
                    {
                        var embeddingVector = embeddings?.FirstOrDefault()?.Vector;
                        var vectorArray = embeddingVector?.ToArray();

                        embeddingsCommand.Connection = conn;
                        embeddingsCommand.Transaction = transaction;
                        embeddingsCommand.CommandText =
                            "INSERT INTO embeddings (document_id, embedding) VALUES (@document_id, @embedding::vector)";

                        embeddingsCommand.Parameters.AddWithValue("document_id", documentId);
                        embeddingsCommand.Parameters.AddWithValue("embedding", vectorArray);

                        embeddingsCommand.ExecuteNonQuery();
                    }
                    transaction.Commit();
                }
            }
        }
        catch (Exception ex)
        {
            var message = ex.Message;
        }
    }
}