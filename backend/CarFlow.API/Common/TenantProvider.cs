using System.Security.Claims;

namespace CarFlow.API.Common;

public interface ITenantProvider
{
    // 0 = niciun tenant (request neautentificat)
    int DealershipId { get; }
    int UserId { get; }
}

public class TenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _accessor;

    public TenantProvider(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    public int DealershipId =>
        int.TryParse(_accessor.HttpContext?.User.FindFirstValue("DealershipId"), out var id) ? id : 0;

    public int UserId =>
        int.TryParse(_accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
}
