namespace Utils;

public class HandbookDocuments
{
    public static readonly string HandbookDocumentsFolderName = "HandbookDocuments";
    public static Dictionary<string, string> Retrieve()
    {
        var handbookDocumentsDirectory = Path.Combine(Directory.GetCurrentDirectory(), HandbookDocumentsFolderName);

        var result = new Dictionary<string, string>();
        foreach (var file in Directory.EnumerateFiles(handbookDocumentsDirectory))
        {
            var data = File.ReadAllText(file);
            var fileName = Path.GetFileName(file);
            
            result.Add(fileName, data);
        }

        return result;    
    }
    
}
