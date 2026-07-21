using CarFlow.API.Common;

namespace CarFlow.API.Models;

public class PipelineStage : ITenantEntity
{
    public int StageId { get; set; }
    public int DealershipId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    // Prag "sta prea mult in etapa" (zile); null = se foloseste Dealership.DefaultStageAlertDays
    public int? AlertDays { get; set; }
    // Rolul notificat cand o masina INTRA in etapa (pe langa Owner): Vanzari | Junior
    public string? NotifyRole { get; set; }
    // Marcheaza etapa "gata de vanzare" — folosita ulterior pentru matching-ul clientilor interesati
    public bool IsSaleReady { get; set; }
    // Marcheaza etapa in care ajunge masina la inregistrarea vanzarii.
    // Flag, nu nume — etapele pot fi redenumite din /etape.
    public bool IsSoldStage { get; set; }
}
