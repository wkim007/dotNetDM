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
    public string? CollectionLabel { get; init; }
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
    public string? DocumentLabel { get; init; }
}

public sealed class ReverseEngineeringCollectionsResponse
{
    public required string Provider { get; init; }
    public required string DatabaseName { get; init; }
    public required string Summary { get; init; }
    public required IReadOnlyList<ReverseEngineeringCollectionInfo> Collections { get; init; }
}

public sealed class ReverseEngineeringRunRequest
{
    public required string Provider { get; init; }
    public required string ConnectionString { get; init; }
    public required string DatabaseName { get; init; }
    public required IReadOnlyList<string> CollectionNames { get; init; }
}

public sealed class ReverseEngineeringRunResponse
{
    public required string Provider { get; init; }
    public required string DatabaseName { get; init; }
    public required string Summary { get; init; }
    public required string ModelJson { get; init; }
}

public sealed class AiValidationRequest
{
    public required string Engine { get; init; }
    public required string Endpoint { get; init; }
    public required string ApiKey { get; init; }
    public required string ApiVersion { get; init; }
    public required string Deployment { get; init; }
}

public sealed class AiValidationResponse
{
    public required bool IsValid { get; init; }
    public required string Message { get; init; }
}

public sealed class AiGenerateRequest
{
    public required string Engine { get; init; }
    public required string Endpoint { get; init; }
    public required string ApiKey { get; init; }
    public required string ApiVersion { get; init; }
    public required string Deployment { get; init; }
    public required string Prompt { get; init; }
    public required string Database { get; init; }
    public string? DatabaseVersion { get; init; }
}

public sealed class AiGenerateResponse
{
    public required string Message { get; init; }
    public required string ModelJson { get; init; }
}

public sealed class AiCommentsRequest
{
    public required string Engine { get; init; }
    public required string Endpoint { get; init; }
    public required string ApiKey { get; init; }
    public required string ApiVersion { get; init; }
    public required string Deployment { get; init; }
    public required string Database { get; init; }
    public string? DatabaseVersion { get; init; }
    public string? SchemaDescription { get; init; }
    public required IReadOnlyList<AiCommentsEntityInput> Entities { get; init; }
}

public sealed class AiCommentsEntityInput
{
    public required string Id { get; init; }
    public required string ObjectType { get; init; }
    public required string Name { get; init; }
    public required string PhysicalName { get; init; }
    public required string Comment { get; init; }
    public required string Definition { get; init; }
    public required IReadOnlyList<AiCommentsAttributeInput> Attributes { get; init; }
}

public sealed class AiCommentsAttributeInput
{
    public required string EntityId { get; init; }
    public required string AttributeId { get; init; }
    public required string Name { get; init; }
    public required string PhysicalName { get; init; }
    public required string DataType { get; init; }
    public required string Comment { get; init; }
    public required string Definition { get; init; }
    public string? ParentAttributeId { get; init; }
    public required int Depth { get; init; }
}

public sealed class AiCommentsResponse
{
    public required string Message { get; init; }
    public required IReadOnlyList<AiEntityCommentResult> EntityComments { get; init; }
    public required IReadOnlyList<AiAttributeCommentResult> AttributeComments { get; init; }
}

public sealed class AiSummaryInsightsRequest
{
    public required string Engine { get; init; }
    public required string Endpoint { get; init; }
    public required string ApiKey { get; init; }
    public required string ApiVersion { get; init; }
    public required string Deployment { get; init; }
    public required string Database { get; init; }
    public string? DatabaseVersion { get; init; }
    public required string SubjectAreaName { get; init; }
    public required AiSummaryStats SummaryStats { get; init; }
    public required IReadOnlyList<AiDeterministicInsightInput> Deterministic { get; init; }
}

public sealed class AiSummaryStats
{
    public int SubjectAreas { get; init; }
    public int Diagrams { get; init; }
    public int Tables { get; init; }
    public int Views { get; init; }
    public int MaterializedViews { get; init; }
    public int Relationships { get; init; }
    public int Columns { get; init; }
    public int Indexes { get; init; }
    public int Schemas { get; init; }
}

public sealed class AiDeterministicInsightInput
{
    public required string Id { get; init; }
    public required string Text { get; init; }
    public required IReadOnlyList<string> Details { get; init; }
}

public sealed class AiSummaryInsightsResponse
{
    public required string AiSummary { get; init; }
    public required IReadOnlyList<string> AiRecommendations { get; init; }
}

public sealed class AiEntityCommentResult
{
    public required string Id { get; init; }
    public required string Comment { get; init; }
    public required string Definition { get; init; }
}

public sealed class AiAttributeCommentResult
{
    public required string EntityId { get; init; }
    public required string AttributeId { get; init; }
    public required string Comment { get; init; }
    public required string Definition { get; init; }
}
