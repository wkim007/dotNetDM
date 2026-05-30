using DataModeler.Api.Models;

namespace DataModeler.Api.Services;

public interface IModelerService
{
    Task<ModelerDiagramDocument> GetDiagramAsync(CancellationToken cancellationToken);
    Task<ModelerDiagramDocument> SaveDiagramAsync(ModelerDiagramDocument diagram, CancellationToken cancellationToken);
    IReadOnlyList<ProviderInfo> GetProviders();
}
