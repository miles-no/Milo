namespace Utils;

public class DocumentSearchResult
{
    public int Id { get; set; }
    public string? Content { get; set; }
    public string? Source { get; set; }
    public double Similarity { get; set; }
}