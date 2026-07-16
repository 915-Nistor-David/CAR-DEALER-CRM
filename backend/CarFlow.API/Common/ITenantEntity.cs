namespace CarFlow.API.Common;

// Orice entitate care apartine unui dealer. Filtrul global + stamparea automata
// din AppDbContext se aplica doar entitatilor care implementeaza interfata asta.
public interface ITenantEntity
{
    int DealershipId { get; set; }
}
