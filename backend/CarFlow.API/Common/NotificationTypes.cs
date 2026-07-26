namespace CarFlow.API.Common;

// Tipurile de notificari si gruparea lor pe categorii.
// Categoria e DERIVATA din tip (nu o coloana in DB), ca sa putem regrupa
// oricand fara migrare — iar tipurile stau aici ca sa nu mai fie string-uri
// magice imprastiate prin controllere.
public static class NotificationTypes
{
    public const string StageMove = "StageMove";
    public const string Sale = "Sale";
    public const string Cost = "Cost";
    public const string StuckInStage = "StuckInStage";
    public const string StockAging = "StockAging";
    public const string RAR = "RAR";
    public const string Document = "Document";
}

// Cele trei categorii cerute de dealer: ce se misca prin pipeline,
// ce tine de bani, si ce trebuie rezolvat repede.
public static class NotificationCategories
{
    public const string Pipeline = "Pipeline";
    public const string Money = "Bani";
    public const string Urgent = "Urgente";

    public static readonly string[] All = { Pipeline, Money, Urgent };

    private static readonly Dictionary<string, string> ByType = new()
    {
        [NotificationTypes.StageMove] = Pipeline,
        [NotificationTypes.Sale] = Money,
        [NotificationTypes.Cost] = Money,
        [NotificationTypes.StuckInStage] = Urgent,
        [NotificationTypes.StockAging] = Urgent,
        [NotificationTypes.RAR] = Urgent,
        [NotificationTypes.Document] = Urgent,
    };

    public static string For(string type) =>
        ByType.TryGetValue(type, out var category) ? category : Pipeline;

    public static string[] TypesIn(string category) =>
        ByType.Where(kv => kv.Value == category).Select(kv => kv.Key).ToArray();

    public static bool IsValid(string category) => All.Contains(category);
}
