namespace CarFlow.API.Common;

// Pragurile de alerta, intr-un singur loc. Le folosesc si ReminderBackgroundService
// (ca sa trimita notificari) si AgendaController (ca sa le afiseze pe calendar).
// Daca ar fi duplicate, agenda si notificarile ar putea sa spuna lucruri diferite
// despre aceeasi masina.
public static class AlertRules
{
    // Cu cate zile inainte anuntam RAR-ul si termenele actelor
    public const int ReminderWindowDays = 3;

    // Ziua in care o masina devine "sta prea mult in etapa".
    public static DateOnly StuckDueDate(DateTime enteredStageAt, int? stageAlertDays, int dealerDefault) =>
        DateOnly.FromDateTime(enteredStageAt.AddDays(stageAlertDays ?? dealerDefault));

    // Ziua in care o masina devine "prea veche in stoc".
    public static DateOnly StockAgingDueDate(DateTime createdAt, int stockAlertDays) =>
        DateOnly.FromDateTime(createdAt.AddDays(stockAlertDays));

    public static int DaysSince(DateTime from, DateTime now) =>
        Math.Max(0, (int)(now - from).TotalDays);
}
