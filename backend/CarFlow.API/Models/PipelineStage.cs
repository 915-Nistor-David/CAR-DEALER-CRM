using CarFlow.API.Common;

namespace CarFlow.API.Models;

public class PipelineStage : ITenantEntity
{
    public int StageId { get; set; }
    public int DealershipId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
