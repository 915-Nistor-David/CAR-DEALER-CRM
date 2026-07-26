using System.ComponentModel.DataAnnotations;

namespace CarFlow.API.Documents;

public class DocumentDto
{
    public int DocumentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsDone { get; set; }
    public DateOnly? DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveDocumentRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public bool IsDone { get; set; }
    public DateOnly? DueDate { get; set; }
}
