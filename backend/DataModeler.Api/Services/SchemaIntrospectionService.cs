using DataModeler.Api.Models;
using MongoDB.Driver;
using Npgsql;
using System.Data.Common;
using Microsoft.Data.SqlClient;

namespace DataModeler.Api.Services;

public interface ISchemaIntrospectionService
{
    Task<IntrospectionResponse> InspectAsync(IntrospectionRequest request, CancellationToken cancellationToken);
    Task<ReverseEngineeringResponse> DiscoverDatabasesAsync(ReverseEngineeringRequest request, CancellationToken cancellationToken);
    Task<ReverseEngineeringCollectionsResponse> DiscoverCollectionsAsync(
        ReverseEngineeringCollectionsRequest request,
        CancellationToken cancellationToken);
}

public sealed class SchemaIntrospectionService : ISchemaIntrospectionService
{
    public async Task<IntrospectionResponse> InspectAsync(IntrospectionRequest request, CancellationToken cancellationToken)
    {
        var provider = request.Provider.Trim().ToLowerInvariant();

        return provider switch
        {
            "sqlserver" => await InspectSqlServerAsync(request, cancellationToken),
            "postgresql" => await InspectPostgreSqlAsync(request, cancellationToken),
            "mongodb" => await InspectMongoDbAsync(request, cancellationToken),
            _ => throw new InvalidOperationException($"Unsupported provider '{request.Provider}'.")
        };
    }

    public async Task<ReverseEngineeringResponse> DiscoverDatabasesAsync(
        ReverseEngineeringRequest request,
        CancellationToken cancellationToken)
    {
        var provider = request.Provider.Trim().ToLowerInvariant();

        return provider switch
        {
            "mongodb" => await DiscoverMongoDbDatabasesAsync(request, cancellationToken),
            _ => throw new InvalidOperationException($"Reverse engineering is not yet supported for provider '{request.Provider}'.")
        };
    }

    public async Task<ReverseEngineeringCollectionsResponse> DiscoverCollectionsAsync(
        ReverseEngineeringCollectionsRequest request,
        CancellationToken cancellationToken)
    {
        var provider = request.Provider.Trim().ToLowerInvariant();

        return provider switch
        {
            "mongodb" => await DiscoverMongoDbCollectionsAsync(request, cancellationToken),
            _ => throw new InvalidOperationException($"Reverse engineering collection discovery is not yet supported for provider '{request.Provider}'.")
        };
    }

    private static async Task<IntrospectionResponse> InspectSqlServerAsync(IntrospectionRequest request, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(request.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        return await BuildRelationalResponseAsync("sqlserver", "SQL Server schema imported.", connection, cancellationToken);
    }

    private static async Task<IntrospectionResponse> InspectPostgreSqlAsync(IntrospectionRequest request, CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(request.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        return await BuildRelationalResponseAsync("postgresql", "PostgreSQL schema imported.", connection, cancellationToken);
    }

    private static async Task<IntrospectionResponse> InspectMongoDbAsync(IntrospectionRequest request, CancellationToken cancellationToken)
    {
        var client = new MongoClient(request.ConnectionString);
        var databaseName = request.DatabaseName;

        if (string.IsNullOrWhiteSpace(databaseName))
        {
            var mongoUrl = new MongoUrl(request.ConnectionString);
            databaseName = mongoUrl.DatabaseName;
        }

        if (string.IsNullOrWhiteSpace(databaseName))
        {
            throw new InvalidOperationException("MongoDB introspection requires a database name in the connection string or request body.");
        }

        var database = client.GetDatabase(databaseName);
        var collectionNames = await database.ListCollectionNames().ToListAsync(cancellationToken);
        var entities = new List<EntityCard>();
        var tabs = DefaultTabs();

        for (var index = 0; index < collectionNames.Count; index++)
        {
            var collectionName = collectionNames[index];
            var collection = database.GetCollection<MongoDB.Bson.BsonDocument>(collectionName);
            var sampleDocument = await collection.Find(FilterDefinition<MongoDB.Bson.BsonDocument>.Empty)
                .Limit(1)
                .FirstOrDefaultAsync(cancellationToken);

            var fields = new List<EntityField>
            {
                new()
                {
                    Id = $"{collectionName}-id",
                    Kind = "PK",
                    Name = "_id",
                    DataType = "ObjectId"
                }
            };

            if (sampleDocument is not null)
            {
                foreach (var element in sampleDocument.Elements.Where(element => element.Name != "_id"))
                {
                    fields.Add(new EntityField
                    {
                        Id = $"{collectionName}-{element.Name}",
                        Kind = "COL",
                        Name = element.Name,
                        DataType = element.Value.BsonType.ToString()
                    });
                }
            }

            entities.Add(new EntityCard
            {
                Id = collectionName,
                Name = ToDisplayName(collectionName),
                PhysicalName = collectionName,
                Comment = "Imported MongoDB collection",
                X = 180 + (index % 3) * 340,
                Y = 120 + (index / 3) * 260,
                Fields = fields
            });
        }

        return new IntrospectionResponse
        {
            Provider = "mongodb",
            Summary = $"MongoDB import found {collectionNames.Count} collections.",
            Diagram = new ModelerDiagramDocument
            {
                Project = new ProjectInfo
                {
                    Name = "Imported Model",
                    ViewMode = "Physical View",
                    Database = "MongoDB",
                    DatabaseVersion = "Live",
                    SubjectArea = databaseName,
                    Definition = "Imported from MongoDB collection metadata.",
                    DiagramDefinition = $"Imported from database '{databaseName}'.",
                    DisplayLevel = "Column"
                },
                Tabs = tabs,
                Entities = entities,
                Relationships = Array.Empty<RelationshipLink>()
            }
        };
    }

    private static async Task<ReverseEngineeringResponse> DiscoverMongoDbDatabasesAsync(
        ReverseEngineeringRequest request,
        CancellationToken cancellationToken)
    {
        var client = new MongoClient(request.ConnectionString);
        var databaseNames = await client.ListDatabaseNames().ToListAsync(cancellationToken);
        var databases = new List<ReverseEngineeringDatabaseInfo>();

        foreach (var databaseName in databaseNames)
        {
            var database = client.GetDatabase(databaseName);
            var collectionCount = await database.ListCollectionNames().ToListAsync(cancellationToken);
            databases.Add(new ReverseEngineeringDatabaseInfo
            {
                Name = databaseName,
                CollectionCount = collectionCount.Count
            });
        }

        return new ReverseEngineeringResponse
        {
            Provider = "mongodb",
            Summary = $"MongoDB connection verified. Found {databases.Count} databases.",
            Databases = databases
                .OrderBy(item => item.Name, StringComparer.OrdinalIgnoreCase)
                .ToList()
        };
    }

    private static async Task<ReverseEngineeringCollectionsResponse> DiscoverMongoDbCollectionsAsync(
        ReverseEngineeringCollectionsRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.DatabaseName))
        {
            throw new InvalidOperationException("A database name is required before loading collections.");
        }

        var client = new MongoClient(request.ConnectionString);
        var database = client.GetDatabase(request.DatabaseName);
        var collectionNames = await database.ListCollectionNames().ToListAsync(cancellationToken);
        var collections = new List<ReverseEngineeringCollectionInfo>();

        foreach (var collectionName in collectionNames.OrderBy(name => name, StringComparer.OrdinalIgnoreCase))
        {
            var collection = database.GetCollection<MongoDB.Bson.BsonDocument>(collectionName);
            var documentCount = await collection.CountDocumentsAsync(
                FilterDefinition<MongoDB.Bson.BsonDocument>.Empty,
                cancellationToken: cancellationToken);

            collections.Add(new ReverseEngineeringCollectionInfo
            {
                Name = collectionName,
                DocumentCount = documentCount
            });
        }

        return new ReverseEngineeringCollectionsResponse
        {
            Provider = "mongodb",
            DatabaseName = request.DatabaseName,
            Summary = $"Loaded {collections.Count} collections from '{request.DatabaseName}'.",
            Collections = collections
        };
    }

    private static async Task<IntrospectionResponse> BuildRelationalResponseAsync(
        string provider,
        string summary,
        DbConnection connection,
        CancellationToken cancellationToken)
    {
        var tables = new List<(string Schema, string Name)>();
        const string sql = """
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
              AND table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY table_schema, table_name
            """;

        await using (var command = connection.CreateCommand())
        {
            command.CommandText = sql;
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                tables.Add((reader.GetString(0), reader.GetString(1)));
            }
        }

        var entities = new List<EntityCard>();

        for (var index = 0; index < tables.Count; index++)
        {
            var table = tables[index];
            entities.Add(new EntityCard
            {
                Id = $"{table.Schema}.{table.Name}",
                Name = ToDisplayName(table.Name),
                PhysicalName = $"{table.Schema}.{table.Name}",
                Comment = "Imported relational table",
                X = 180 + (index % 3) * 340,
                Y = 120 + (index / 3) * 280,
                Fields = await LoadColumnsAsync(connection, table.Schema, table.Name, cancellationToken)
            });
        }

        return new IntrospectionResponse
        {
            Provider = provider,
            Summary = $"{summary} Found {tables.Count} tables.",
            Diagram = new ModelerDiagramDocument
            {
                Project = new ProjectInfo
                {
                    Name = "Imported Model",
                    ViewMode = "Physical View",
                    Database = provider == "sqlserver" ? "SQL Server" : "PostgreSQL",
                    DatabaseVersion = "Live",
                    SubjectArea = connection.Database,
                    Definition = "Imported from relational schema metadata.",
                    DiagramDefinition = $"Imported from database '{connection.Database}'.",
                    DisplayLevel = "Column"
                },
                Tabs = DefaultTabs(),
                Entities = entities,
                Relationships = Array.Empty<RelationshipLink>()
            }
        };
    }

    private static async Task<IReadOnlyList<EntityField>> LoadColumnsAsync(
        DbConnection connection,
        string schema,
        string table,
        CancellationToken cancellationToken)
    {
        var fields = new List<EntityField>();
        const string sql = """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = @schema AND table_name = @table
            ORDER BY ordinal_position
            """;

        await using var command = connection.CreateCommand();
        command.CommandText = sql;

        var schemaParameter = command.CreateParameter();
        schemaParameter.ParameterName = "@schema";
        schemaParameter.Value = schema;
        command.Parameters.Add(schemaParameter);

        var tableParameter = command.CreateParameter();
        tableParameter.ParameterName = "@table";
        tableParameter.Value = table;
        command.Parameters.Add(tableParameter);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            fields.Add(new EntityField
            {
                Id = $"{schema}.{table}.{reader.GetString(0)}",
                Kind = fields.Count == 0 ? "PK" : "COL",
                Name = reader.GetString(0),
                DataType = reader.GetString(1)
            });
        }

        return fields;
    }

    private static IReadOnlyList<DiagramTab> DefaultTabs()
    {
        return new List<DiagramTab>
        {
            new() { Id = "physical", Label = "Physical", Active = true },
            new() { Id = "logical", Label = "Logical", Active = false },
            new() { Id = "entity-definition", Label = "EntityDefinition", Active = false },
            new() { Id = "entity", Label = "Entity", Active = false },
            new() { Id = "physical-index", Label = "PhysicalIndex", Active = false }
        };
    }

    private static string ToDisplayName(string value)
    {
        return string.Join(
            ' ',
            value
                .Replace("_", " ")
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Select(part => char.ToUpperInvariant(part[0]) + part[1..]));
    }
}
