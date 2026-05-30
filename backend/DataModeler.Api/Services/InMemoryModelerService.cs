using System.Text.Json;
using DataModeler.Api.Models;

namespace DataModeler.Api.Services;

public sealed class InMemoryModelerService : IModelerService
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly string _storagePath;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public InMemoryModelerService(IWebHostEnvironment environment)
    {
        var appDataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(appDataDirectory);
        _storagePath = Path.Combine(appDataDirectory, "diagram.json");
    }

    public async Task<ModelerDiagramDocument> GetDiagramAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_storagePath))
        {
            var seed = CreateSeedDiagram();
            await SaveDiagramAsync(seed, cancellationToken);
            return seed;
        }

        await using var stream = File.OpenRead(_storagePath);
        var document = await JsonSerializer.DeserializeAsync<ModelerDiagramDocument>(stream, SerializerOptions, cancellationToken);
        return document ?? CreateSeedDiagram();
    }

    public async Task<ModelerDiagramDocument> SaveDiagramAsync(ModelerDiagramDocument diagram, CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);

        try
        {
            await using var stream = File.Create(_storagePath);
            await JsonSerializer.SerializeAsync(stream, diagram, SerializerOptions, cancellationToken);
            return diagram;
        }
        finally
        {
            _gate.Release();
        }
    }

    public IReadOnlyList<ProviderInfo> GetProviders()
    {
        return new List<ProviderInfo>
        {
            new()
            {
                Id = "sqlserver",
                DisplayName = "SQL Server",
                Category = "Relational",
                Notes = "Use EF Core SQL Server provider for schema generation and reverse engineering."
            },
            new()
            {
                Id = "postgresql",
                DisplayName = "PostgreSQL",
                Category = "Relational",
                Notes = "Use Npgsql EF Core provider for migrations, type mapping, and metadata browsing."
            },
            new()
            {
                Id = "mongodb",
                DisplayName = "MongoDB",
                Category = "Document",
                Notes = "Use MongoDB.Driver for collection metadata and document-shape inspection alongside the modeler."
            }
        };
    }

    private static ModelerDiagramDocument CreateSeedDiagram()
    {
        return new ModelerDiagramDocument
        {
            Project = new ProjectInfo
            {
                Name = "Data Modeler",
                ViewMode = "Physical View",
                Database = "PostgreSQL",
                DatabaseVersion = "16",
                SubjectArea = "<model>",
                Definition = "Drag entities, define attributes, and wire relationships.",
                DiagramDefinition = "Sample bookstore and fulfillment domain.",
                DisplayLevel = "Column"
            },
            Tabs = new List<DiagramTab>
            {
                new() { Id = "physical", Label = "Physical", Active = true },
                new() { Id = "logical", Label = "Logical", Active = false },
                new() { Id = "entity-definition", Label = "EntityDefinition", Active = false },
                new() { Id = "entity", Label = "Entity", Active = false },
                new() { Id = "physical-index", Label = "PhysicalIndex", Active = false }
            },
            Entities = new List<EntityCard>
            {
                new()
                {
                    Id = "store",
                    Name = "Store Name",
                    PhysicalName = "Store",
                    Comment = "The retail location where books are sold and orders originate.",
                    X = 430,
                    Y = 120,
                    Fields = new List<EntityField>
                    {
                        new() { Id = "store-id", Kind = "PK", Name = "StoreId", DataType = "uuid" },
                        new() { Id = "store-name", Kind = "COL", Name = "StoreName", DataType = "varchar(80)" },
                        new() { Id = "store-city", Kind = "COL", Name = "City", DataType = "varchar(40)" },
                        new() { Id = "store-state", Kind = "COL", Name = "State", DataType = "varchar(10)" },
                        new() { Id = "store-region-id", Kind = "FK", Name = "RegionId", DataType = "uuid" }
                    }
                },
                new()
                {
                    Id = "order",
                    Name = "Purchase Order",
                    PhysicalName = "PurchaseOrder",
                    Comment = "Represents store-level customer purchases.",
                    X = 790,
                    Y = 130,
                    Fields = new List<EntityField>
                    {
                        new() { Id = "order-number", Kind = "PK", Name = "OrderNumber", DataType = "integer" },
                        new() { Id = "payment-terms", Kind = "COL", Name = "PaymentTerms", DataType = "varchar(12)" },
                        new() { Id = "order-date", Kind = "COL", Name = "OrderDate", DataType = "date" },
                        new() { Id = "customer-id", Kind = "FK", Name = "CustomerId", DataType = "uuid" },
                        new() { Id = "store-id-fk", Kind = "FK", Name = "StoreId", DataType = "uuid" }
                    }
                },
                new()
                {
                    Id = "employee",
                    Name = "Employee",
                    PhysicalName = "Employee",
                    Comment = "Staff assigned to operational jobs.",
                    X = 430,
                    Y = 520,
                    Fields = new List<EntityField>
                    {
                        new() { Id = "employee-id", Kind = "PK", Name = "EmployeeId", DataType = "uuid" },
                        new() { Id = "first-name", Kind = "COL", Name = "FirstName", DataType = "varchar(40)" },
                        new() { Id = "last-name", Kind = "COL", Name = "LastName", DataType = "varchar(40)" },
                        new() { Id = "hire-date", Kind = "COL", Name = "HireDate", DataType = "date" },
                        new() { Id = "job-id", Kind = "FK", Name = "JobId", DataType = "uuid" }
                    }
                },
                new()
                {
                    Id = "job",
                    Name = "Job",
                    PhysicalName = "Job",
                    Comment = "Defines staff responsibility and level ranges.",
                    X = 790,
                    Y = 380,
                    Fields = new List<EntityField>
                    {
                        new() { Id = "job-id-pk", Kind = "PK", Name = "JobId", DataType = "uuid" },
                        new() { Id = "job-description", Kind = "COL", Name = "JobDescription", DataType = "varchar(80)" },
                        new() { Id = "min-level", Kind = "COL", Name = "MinLevel", DataType = "smallint" },
                        new() { Id = "max-level", Kind = "COL", Name = "MaxLevel", DataType = "smallint" }
                    }
                },
                new()
                {
                    Id = "book",
                    Name = "Book",
                    PhysicalName = "Book",
                    Comment = "Catalog item sold in orders.",
                    X = 420,
                    Y = 810,
                    Fields = new List<EntityField>
                    {
                        new() { Id = "book-id", Kind = "PK", Name = "BookId", DataType = "uuid" },
                        new() { Id = "book-name", Kind = "COL", Name = "BookName", DataType = "varchar(120)" },
                        new() { Id = "book-type", Kind = "COL", Name = "BookType", DataType = "varchar(24)" },
                        new() { Id = "price", Kind = "COL", Name = "Price", DataType = "decimal(19,4)" }
                    }
                },
                new()
                {
                    Id = "order-item",
                    Name = "Order Item",
                    PhysicalName = "OrderItem",
                    Comment = "Line items attached to a purchase order.",
                    X = 760,
                    Y = 820,
                    Fields = new List<EntityField>
                    {
                        new() { Id = "item-sequence", Kind = "PK", Name = "ItemSequence", DataType = "integer" },
                        new() { Id = "order-number-fk", Kind = "FK", Name = "OrderNumber", DataType = "integer" },
                        new() { Id = "book-id-fk", Kind = "FK", Name = "BookId", DataType = "uuid" },
                        new() { Id = "quantity", Kind = "COL", Name = "Quantity", DataType = "smallint" },
                        new() { Id = "order-price", Kind = "COL", Name = "OrderPrice", DataType = "decimal(7,2)" }
                    }
                },
                new()
                {
                    Id = "author",
                    Name = "Author",
                    PhysicalName = "Author",
                    Comment = "Writer metadata for cataloged books.",
                    X = 1070,
                    Y = 620,
                    Fields = new List<EntityField>
                    {
                        new() { Id = "author-id", Kind = "PK", Name = "AuthorId", DataType = "uuid" },
                        new() { Id = "author-last-name", Kind = "COL", Name = "LastName", DataType = "varchar(50)" },
                        new() { Id = "author-first-name", Kind = "COL", Name = "FirstName", DataType = "varchar(50)" },
                        new() { Id = "author-phone-number", Kind = "COL", Name = "PhoneNumber", DataType = "varchar(20)" }
                    }
                }
            },
            Relationships = new List<RelationshipLink>
            {
                new() { Id = "store-orders", SourceEntityId = "store", TargetEntityId = "order", Cardinality = "1:N", Style = "solid" },
                new() { Id = "job-employees", SourceEntityId = "job", TargetEntityId = "employee", Cardinality = "1:N", Style = "solid" },
                new() { Id = "orders-items", SourceEntityId = "order", TargetEntityId = "order-item", Cardinality = "1:N", Style = "solid" },
                new() { Id = "books-items", SourceEntityId = "book", TargetEntityId = "order-item", Cardinality = "1:N", Style = "dashed" },
                new() { Id = "authors-books", SourceEntityId = "author", TargetEntityId = "book", Cardinality = "1:N", Style = "dashed" }
            }
        };
    }
}
