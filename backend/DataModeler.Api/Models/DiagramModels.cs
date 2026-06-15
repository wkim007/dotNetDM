namespace DataModeler.Api.Models;

public sealed class ModelerDiagramDocument
{
    public required ProjectInfo Project { get; init; }
    public required IReadOnlyList<DiagramTab> Tabs { get; init; }
    public required IReadOnlyList<EntityCard> Entities { get; init; }
    public required IReadOnlyList<RelationshipLink> Relationships { get; init; }
}

public sealed class ProjectInfo
{
    public required string Name { get; init; }
    public required string ViewMode { get; init; }
    public required string Database { get; init; }
    public required string DatabaseVersion { get; init; }
    public required string SubjectArea { get; init; }
    public required string Definition { get; init; }
    public required string DiagramDefinition { get; init; }
    public required string DisplayLevel { get; init; }
}

public sealed class DiagramTab
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public required bool Active { get; init; }
}

public sealed class EntityCard
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string PhysicalName { get; init; }
    public required string Comment { get; init; }
    public required int X { get; init; }
    public required int Y { get; init; }
    public required IReadOnlyList<EntityField> Fields { get; init; }
}

public sealed class EntityField
{
    public required string Id { get; init; }
    public required string Kind { get; init; }
    public required string Name { get; init; }
    public required string DataType { get; init; }
}

public sealed class RelationshipLink
{
    public required string Id { get; init; }
    public required string SourceEntityId { get; init; }
    public required string TargetEntityId { get; init; }
    public required string Cardinality { get; init; }
    public required string Style { get; init; }
}

public sealed class ProviderInfo
{
    public required string Id { get; init; }
    public required string DisplayName { get; init; }
    public required string Category { get; init; }
    public required string Notes { get; init; }
}

public sealed class SaveDiagramRequest
{
    public required ModelerDiagramDocument Diagram { get; init; }
}

public sealed class IntrospectionRequest
{
    public required string Provider { get; init; }
    public required string ConnectionString { get; init; }
    public string? DatabaseName { get; init; }
}

public sealed class IntrospectionResponse
{
    public required string Provider { get; init; }
    public required string Summary { get; init; }
    public required ModelerDiagramDocument Diagram { get; init; }
}

public sealed class ReverseEngineeringRequest
{
    public required string Provider { get; init; }
    public required string ConnectionString { get; init; }
}

public sealed class ReverseEngineeringDatabaseInfo
{
    public required string Name { get; init; }
    public int CollectionCount { get; init; }
}

public sealed class ReverseEngineeringResponse
{
    public required string Provider { get; init; }
    public required string Summary { get; init; }
    public required IReadOnlyList<ReverseEngineeringDatabaseInfo> Databases { get; init; }
}

public sealed class ReverseEngineeringCollectionsRequest
{
    public required string Provider { get; init; }
    public required string ConnectionString { get; init; }
    public required string DatabaseName { get; init; }
}

public sealed class ReverseEngineeringCollectionInfo
{
    public required string Name { get; init; }
    public long DocumentCount { get; init; }
}

public sealed class ReverseEngineeringCollectionsResponse
{
    public required string Provider { get; init; }
    public required string DatabaseName { get; init; }
    public required string Summary { get; init; }
    public required IReadOnlyList<ReverseEngineeringCollectionInfo> Collections { get; init; }
}
