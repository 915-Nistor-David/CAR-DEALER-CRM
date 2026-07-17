using CarFlow.API.Common;
using CarFlow.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CarFlow.API.Data;

public class AppDbContext : DbContext
{
    private readonly ITenantProvider _tenant;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantProvider tenant) : base(options)
    {
        _tenant = tenant;
    }

    public DbSet<Dealership> Dealerships => Set<Dealership>();
    public DbSet<User> Users => Set<User>();
    public DbSet<PipelineStage> PipelineStages => Set<PipelineStage>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<VehicleStatusHistory> VehicleStatusHistory => Set<VehicleStatusHistory>();
    public DbSet<VehicleCost> VehicleCosts => Set<VehicleCost>();
    public DbSet<VehiclePhoto> VehiclePhotos => Set<VehiclePhoto>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<VehicleDocument> VehicleDocuments => Set<VehicleDocument>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        mb.Entity<PipelineStage>().HasKey(s => s.StageId);
        mb.Entity<VehicleStatusHistory>().HasKey(h => h.HistoryId);
        mb.Entity<VehicleCost>().HasKey(c => c.CostId);
        mb.Entity<VehiclePhoto>().HasKey(p => p.PhotoId);
        mb.Entity<Notification>().HasKey(n => n.NotificationId);
        mb.Entity<VehicleDocument>().HasKey(d => d.DocumentId);

        mb.Entity<User>().HasIndex(u => u.Email).IsUnique();
        mb.Entity<User>()
            .HasOne(u => u.Dealership)
            .WithMany()
            .HasForeignKey(u => u.DealershipId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Vehicle>()
            .HasOne(v => v.CurrentStage)
            .WithMany()
            .HasForeignKey(v => v.CurrentStageId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Vehicle>().Property(v => v.PurchasePrice).HasPrecision(12, 2);
        mb.Entity<VehicleCost>().Property(c => c.Amount).HasPrecision(12, 2);
        mb.Entity<Sale>().Property(s => s.SalePrice).HasPrecision(12, 2);

        mb.Entity<VehicleStatusHistory>()
            .HasOne<Vehicle>()
            .WithMany(v => v.History)
            .HasForeignKey(h => h.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<VehicleCost>()
            .HasOne<Vehicle>()
            .WithMany(v => v.Costs)
            .HasForeignKey(c => c.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<VehiclePhoto>()
            .HasOne<Vehicle>()
            .WithMany(v => v.Photos)
            .HasForeignKey(p => p.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Sale>()
            .HasOne<Vehicle>()
            .WithOne(v => v.Sale)
            .HasForeignKey<Sale>(s => s.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Sale>().HasIndex(s => s.VehicleId).IsUnique();

        mb.Entity<Notification>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Notification>().HasIndex(n => new { n.UserId, n.IsRead });

        mb.Entity<VehicleDocument>()
            .HasOne<Vehicle>()
            .WithMany()
            .HasForeignKey(d => d.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

        // ===== Izolare multi-tenant: filtru global pe fiecare entitate de tenant =====
        // _tenant.DealershipId este evaluat per-request (DbContext e scoped),
        // deci un dealer nu poate vedea NICIODATA datele altuia.
        mb.Entity<PipelineStage>().HasQueryFilter(e => e.DealershipId == _tenant.DealershipId);
        mb.Entity<Vehicle>().HasQueryFilter(e => e.DealershipId == _tenant.DealershipId);
        mb.Entity<VehicleStatusHistory>().HasQueryFilter(e => e.DealershipId == _tenant.DealershipId);
        mb.Entity<VehicleCost>().HasQueryFilter(e => e.DealershipId == _tenant.DealershipId);
        mb.Entity<VehiclePhoto>().HasQueryFilter(e => e.DealershipId == _tenant.DealershipId);
        mb.Entity<Sale>().HasQueryFilter(e => e.DealershipId == _tenant.DealershipId);
        mb.Entity<Notification>().HasQueryFilter(e => e.DealershipId == _tenant.DealershipId);
        mb.Entity<VehicleDocument>().HasQueryFilter(e => e.DealershipId == _tenant.DealershipId);
    }

    // Stampam automat DealershipId pe orice insert de entitate de tenant,
    // ca sa nu poata fi uitat (sau falsificat) in controllere.
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added && entry.Entity.DealershipId == 0)
                entry.Entity.DealershipId = _tenant.DealershipId;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
