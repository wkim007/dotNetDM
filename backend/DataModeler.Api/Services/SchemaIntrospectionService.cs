using DataModeler.Api.Models;
using MongoDB.Bson;
using MongoDB.Driver;
using Npgsql;
using System.Data.Common;
using Microsoft.Data.SqlClient;
using System.Text.Json;

namespace DataModeler.Api.Services;

public interface ISchemaIntrospectionService
{
    Task<IntrospectionResponse> InspectAsync(IntrospectionRequest request, CancellationToken cancellationToken);
    Task<ReverseEngineeringResponse> DiscoverDatabasesAsync(ReverseEngineeringRequest request, CancellationToken cancellationToken);
    Task<ReverseEngineeringCollectionsResponse> DiscoverCollectionsAsync(
        ReverseEngineeringCollectionsRequest request,
        CancellationToken cancellationToken);
    Task<ReverseEngineeringRunResponse> ReverseEngineerAsync(
        ReverseEngineeringRunRequest request,
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
            "sqlserver" => await DiscoverSqlServerDatabasesAsync(request, cancellationToken),
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
            "sqlserver" => await DiscoverSqlServerTablesAsync(request, cancellationToken),
            "mongodb" => await DiscoverMongoDbCollectionsAsync(request, cancellationToken),
            _ => throw new InvalidOperationException($"Reverse engineering collection discovery is not yet supported for provider '{request.Provider}'.")
        };
    }

    public async Task<ReverseEngineeringRunResponse> ReverseEngineerAsync(
        ReverseEngineeringRunRequest request,
        CancellationToken cancellationToken)
    {
        var provider = request.Provider.Trim().ToLowerInvariant();

        return provider switch
        {
            "sqlserver" => await ReverseEngineerSqlServerAsync(request, cancellationToken),
            "mongodb" => await ReverseEngineerMongoDbAsync(request, cancellationToken),
            _ => throw new InvalidOperationException($"Reverse engineering run is not yet supported for provider '{request.Provider}'.")
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
                CollectionCount = collectionCount.Count,
                CollectionLabel = "collections"
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

    private static async Task<ReverseEngineeringResponse> DiscoverSqlServerDatabasesAsync(
        ReverseEngineeringRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(BuildSqlServerConnectionString(request.ConnectionString, "master"));
        await connection.OpenAsync(cancellationToken);

        var databases = new List<ReverseEngineeringDatabaseInfo>();
        const string sql = """
            SELECT d.name,
                   COUNT(t.object_id) AS table_count
            FROM sys.databases d
            LEFT JOIN sys.tables t
                ON d.database_id > 4
               AND t.is_ms_shipped = 0
               AND t.type = 'U'
               AND t.object_id IN (
                    SELECT object_id
                    FROM sys.tables
               )
            WHERE d.state = 0
              AND d.database_id > 4
            GROUP BY d.name
            ORDER BY d.name;
            """;

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var databaseName = reader.GetString(0);
            var tableCount = await CountSqlServerTablesAsync(request.ConnectionString, databaseName, cancellationToken);
            databases.Add(new ReverseEngineeringDatabaseInfo
            {
                Name = databaseName,
                CollectionCount = tableCount,
                CollectionLabel = "tables"
            });
        }

        return new ReverseEngineeringResponse
        {
            Provider = "sqlserver",
            Summary = $"SQL Server connection verified. Found {databases.Count} databases.",
            Databases = databases
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
                DocumentCount = documentCount,
                DocumentLabel = "documents"
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

    private static async Task<ReverseEngineeringCollectionsResponse> DiscoverSqlServerTablesAsync(
        ReverseEngineeringCollectionsRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.DatabaseName))
        {
            throw new InvalidOperationException("A database name is required before loading tables.");
        }

        await using var connection = new SqlConnection(BuildSqlServerConnectionString(request.ConnectionString, request.DatabaseName));
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT t.TABLE_SCHEMA,
                   t.TABLE_NAME,
                   COUNT(c.COLUMN_NAME) AS column_count
            FROM INFORMATION_SCHEMA.TABLES t
            LEFT JOIN INFORMATION_SCHEMA.COLUMNS c
              ON c.TABLE_SCHEMA = t.TABLE_SCHEMA
             AND c.TABLE_NAME = t.TABLE_NAME
            WHERE t.TABLE_TYPE = 'BASE TABLE'
              AND t.TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
            GROUP BY t.TABLE_SCHEMA, t.TABLE_NAME
            ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME;
            """;

        var collections = new List<ReverseEngineeringCollectionInfo>();
        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var schema = reader.GetString(0);
            var table = reader.GetString(1);
            var columnCount = reader.GetInt32(2);
            collections.Add(new ReverseEngineeringCollectionInfo
            {
                Name = $"{schema}.{table}",
                DocumentCount = columnCount,
                DocumentLabel = "columns"
            });
        }

        return new ReverseEngineeringCollectionsResponse
        {
            Provider = "sqlserver",
            DatabaseName = request.DatabaseName,
            Summary = $"Loaded {collections.Count} tables from '{request.DatabaseName}'.",
            Collections = collections
        };
    }

    private static async Task<ReverseEngineeringRunResponse> ReverseEngineerMongoDbAsync(
        ReverseEngineeringRunRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.DatabaseName))
        {
            throw new InvalidOperationException("A database name is required before running reverse engineering.");
        }

        var collectionNames = request.CollectionNames
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (collectionNames.Count == 0)
        {
            throw new InvalidOperationException("Select at least one collection before running reverse engineering.");
        }

        var client = new MongoClient(request.ConnectionString);
        var database = client.GetDatabase(request.DatabaseName);
        var idAllocator = new SequentialIdAllocator();
        var entityPayloads = new List<object>();
        var entityShapePayloads = new List<object>();
        var collectionSamples = new List<MongoCollectionSample>();

        for (var index = 0; index < collectionNames.Count; index++)
        {
            var collectionName = collectionNames[index];
            var collection = database.GetCollection<BsonDocument>(collectionName);
            var sampleDocuments = await collection.Find(FilterDefinition<BsonDocument>.Empty)
                .Limit(200)
                .ToListAsync(cancellationToken);
            var entityId = idAllocator.Next();
            var sample = BuildMongoCollectionSample(collectionName, entityId, sampleDocuments, idAllocator);
            collectionSamples.Add(sample);
        }

        var relationships = InferMongoCollectionRelationships(collectionSamples, idAllocator);
        var relationshipRefsByEntityId = collectionSamples.ToDictionary(
            sample => sample.EntityId,
            _ => new RelationshipRefs());

        foreach (var relationship in relationships)
        {
            if (relationshipRefsByEntityId.TryGetValue(relationship.ParentEntityId, out var parentRefs))
            {
                parentRefs.ChildIds.Add(relationship.Id);
            }

            if (relationshipRefsByEntityId.TryGetValue(relationship.ChildEntityId, out var childRefs))
            {
                childRefs.ParentIds.Add(relationship.Id);
            }
        }

        for (var index = 0; index < collectionSamples.Count; index++)
        {
            var sample = collectionSamples[index];
            relationshipRefsByEntityId.TryGetValue(sample.EntityId, out var refs);

            entityPayloads.Add(new
            {
                id = sample.EntityId,
                name = sample.CollectionName,
                physicalName = sample.CollectionName,
                definition = "",
                comment = "",
                physicalOnly = false,
                logicalOnly = false,
                props = new
                {
                    pSchemaRef = "",
                    pParentRelationshipsRef = refs is null ? new List<string>() : refs.ParentIds,
                    pChildRelationshipsRef = refs is null ? new List<string>() : refs.ChildIds
                },
                attributes = sample.Attributes,
                indexes = Array.Empty<object>()
            });

            entityShapePayloads.Add(new
            {
                id = sample.EntityId,
                name = sample.CollectionName,
                physicalName = sample.CollectionName,
                displayLevelLogical = "-1",
                displayLevelPhysical = "-1",
                x = 160 + (index % 3) * 340,
                y = 120 + (index / 3) * 260,
                width = 280,
                height = 0
            });
        }

        var relationshipPayloads = relationships.Select(relationship => new
        {
            id = relationship.Id,
            name = relationship.Name,
            physicalName = relationship.Name,
            definition = "",
            comment = "",
            description = relationship.Description,
            parent = relationship.ParentEntityId,
            child = relationship.ChildEntityId,
            parentAttribute = relationship.ParentAttribute,
            childAttribute = relationship.ChildAttribute,
            cardinality = relationship.Cardinality,
            relationshipType = "7",
            physicalOnly = false,
            logicalOnly = false,
            parentToChildVerbPhrase = "",
            childToParentVerbPhrase = ""
        }).ToList();

        var relationshipShapePayloads = relationships.Select(relationship => new
        {
            id = relationship.Id,
            name = relationship.Name,
            physicalName = relationship.Name
        }).ToList();

        var workspacePayload = new
        {
            meta = new
            {
                db = "1075859196",
                dbMajorVersion = "6",
                dbMinorVersion = "0",
                modelType = "3",
                viewMode = "physical",
                activeSubjectAreaId = "1",
                activeDiagramId = "1",
                nextDiagramSeq = 2,
                nextSubjectAreaSeq = 2
            },
            workspace = new
            {
                entities = entityPayloads,
                views = Array.Empty<object>(),
                cachedViews = Array.Empty<object>(),
                relationships = relationshipPayloads,
                schemas = Array.Empty<object>(),
                databases = Array.Empty<object>(),
                catalogs = Array.Empty<object>(),
                subjectAreas = new[]
                {
                    new
                    {
                        id = "1",
                        name = "<model>",
                        locked = true,
                        diagrams = new[]
                        {
                            new
                            {
                                id = "1",
                                name = "ER_Diagram_1",
                                definition = "",
                                displayLevelLogical = "1",
                                displayLevelPhysical = "1",
                                modelShapes = new
                                {
                                    entities = entityShapePayloads,
                                    views = Array.Empty<object>(),
                                    cachedViews = Array.Empty<object>(),
                                    relationships = relationshipShapePayloads
                                }
                            }
                        }
                    }
                }
            }
        };

        return new ReverseEngineeringRunResponse
        {
            Provider = "mongodb",
            DatabaseName = request.DatabaseName,
            Summary = $"Reverse engineered {collectionNames.Count} collections from '{request.DatabaseName}'.",
            ModelJson = JsonSerializer.Serialize(
                workspacePayload,
                new JsonSerializerOptions
                {
                    WriteIndented = true
                })
        };
    }

    private static async Task<ReverseEngineeringRunResponse> ReverseEngineerSqlServerAsync(
        ReverseEngineeringRunRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.DatabaseName))
        {
            throw new InvalidOperationException("A database name is required before running reverse engineering.");
        }

        var selectedTableKeys = request.CollectionNames
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(ParseSqlServerTableKey)
            .Distinct()
            .OrderBy(item => item.Schema, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (selectedTableKeys.Count == 0)
        {
            throw new InvalidOperationException("Select at least one table before running reverse engineering.");
        }

        await using var connection = new SqlConnection(BuildSqlServerConnectionString(request.ConnectionString, request.DatabaseName));
        await connection.OpenAsync(cancellationToken);

        var idAllocator = new SequentialIdAllocator();
        var entityPayloads = new List<object>();
        var entityShapePayloads = new List<object>();
        var entityIdsByTableKey = new Dictionary<SqlServerTableKey, string>();
        var tableKeysByEntityId = new Dictionary<string, SqlServerTableKey>();

        foreach (var tableKey in selectedTableKeys)
        {
            var entityId = idAllocator.Next();
            entityIdsByTableKey[tableKey] = entityId;
            tableKeysByEntityId[entityId] = tableKey;
        }

        var foreignKeys = await LoadSqlServerForeignKeysAsync(connection, cancellationToken);
        var selectedTableKeySet = selectedTableKeys.ToHashSet();
        var includedForeignKeys = foreignKeys
            .Where(foreignKey =>
                selectedTableKeySet.Contains(foreignKey.ParentTable) &&
                selectedTableKeySet.Contains(foreignKey.ChildTable))
            .ToList();

        var relationshipRefsByEntityId = entityIdsByTableKey.Values.ToDictionary(
            entityId => entityId,
            _ => new RelationshipRefs());
        var relationshipPayloads = new List<object>();
        var relationshipShapePayloads = new List<object>();

        foreach (var foreignKey in includedForeignKeys)
        {
            var relationshipId = idAllocator.Next();
            relationshipPayloads.Add(new
            {
                id = relationshipId,
                name = foreignKey.Name,
                physicalName = foreignKey.Name,
                definition = "",
                comment = "",
                description = $"References {foreignKey.ParentTable.Schema}.{foreignKey.ParentTable.Name}",
                parent = entityIdsByTableKey[foreignKey.ParentTable],
                child = entityIdsByTableKey[foreignKey.ChildTable],
                parentAttribute = foreignKey.ParentColumn,
                childAttribute = foreignKey.ChildColumn,
                cardinality = "1:N",
                relationshipType = "7",
                physicalOnly = false,
                logicalOnly = false,
                parentToChildVerbPhrase = "",
                childToParentVerbPhrase = ""
            });
            relationshipShapePayloads.Add(new
            {
                id = relationshipId,
                name = foreignKey.Name,
                physicalName = foreignKey.Name
            });

            relationshipRefsByEntityId[entityIdsByTableKey[foreignKey.ParentTable]].ChildIds.Add(relationshipId);
            relationshipRefsByEntityId[entityIdsByTableKey[foreignKey.ChildTable]].ParentIds.Add(relationshipId);
        }

        for (var index = 0; index < selectedTableKeys.Count; index++)
        {
            var tableKey = selectedTableKeys[index];
            var entityId = entityIdsByTableKey[tableKey];
            var columns = await LoadSqlServerTableColumnsAsync(connection, tableKey, cancellationToken);
            var refs = relationshipRefsByEntityId[entityId];

            entityPayloads.Add(new
            {
                id = entityId,
                name = tableKey.Name,
                physicalName = $"{tableKey.Schema}.{tableKey.Name}",
                definition = "",
                comment = "",
                physicalOnly = false,
                logicalOnly = false,
                props = new
                {
                    pSchemaRef = tableKey.Schema,
                    pParentRelationshipsRef = refs.ParentIds,
                    pChildRelationshipsRef = refs.ChildIds
                },
                attributes = columns,
                indexes = Array.Empty<object>()
            });

            entityShapePayloads.Add(new
            {
                id = entityId,
                name = tableKey.Name,
                physicalName = $"{tableKey.Schema}.{tableKey.Name}",
                displayLevelLogical = "-1",
                displayLevelPhysical = "-1",
                x = 160 + (index % 3) * 340,
                y = 120 + (index / 3) * 260,
                width = 280,
                height = 0
            });
        }

        var workspacePayload = new
        {
            meta = new
            {
                db = "1075859016",
                dbMajorVersion = await LoadSqlServerMajorVersionAsync(connection, cancellationToken),
                dbMinorVersion = "0",
                modelType = "3",
                viewMode = "physical",
                activeSubjectAreaId = "1",
                activeDiagramId = "1",
                nextDiagramSeq = 2,
                nextSubjectAreaSeq = 2
            },
            workspace = new
            {
                entities = entityPayloads,
                views = Array.Empty<object>(),
                cachedViews = Array.Empty<object>(),
                relationships = relationshipPayloads,
                schemas = selectedTableKeys
                    .Select(tableKey => tableKey.Schema)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Select(schema => new { id = schema, name = schema, comment = "" })
                    .ToList(),
                databases = Array.Empty<object>(),
                catalogs = Array.Empty<object>(),
                subjectAreas = new[]
                {
                    new
                    {
                        id = "1",
                        name = "<model>",
                        locked = true,
                        diagrams = new[]
                        {
                            new
                            {
                                id = "1",
                                name = "ER_Diagram_1",
                                definition = "",
                                displayLevelLogical = "1",
                                displayLevelPhysical = "1",
                                modelShapes = new
                                {
                                    entities = entityShapePayloads,
                                    views = Array.Empty<object>(),
                                    cachedViews = Array.Empty<object>(),
                                    relationships = relationshipShapePayloads
                                }
                            }
                        }
                    }
                }
            }
        };

        return new ReverseEngineeringRunResponse
        {
            Provider = "sqlserver",
            DatabaseName = request.DatabaseName,
            Summary = $"Reverse engineered {selectedTableKeys.Count} tables from '{request.DatabaseName}'.",
            ModelJson = JsonSerializer.Serialize(
                workspacePayload,
                new JsonSerializerOptions
                {
                    WriteIndented = true
                })
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

    private static string BuildSqlServerConnectionString(string connectionString, string databaseName)
    {
        var builder = new SqlConnectionStringBuilder(connectionString)
        {
            InitialCatalog = databaseName
        };

        return builder.ConnectionString;
    }

    private static async Task<int> CountSqlServerTablesAsync(
        string connectionString,
        string databaseName,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(BuildSqlServerConnectionString(connectionString, databaseName));
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
              AND TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA');
            """;

        await using var command = new SqlCommand(sql, connection);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is int count ? count : Convert.ToInt32(result);
    }

    private static SqlServerTableKey ParseSqlServerTableKey(string value)
    {
        var trimmed = value.Trim();
        var parts = trimmed.Split('.', 2, StringSplitOptions.TrimEntries);
        return parts.Length == 2
            ? new SqlServerTableKey(parts[0], parts[1])
            : new SqlServerTableKey("dbo", trimmed);
    }

    private static async Task<string> LoadSqlServerMajorVersionAsync(SqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = "SELECT CAST(SERVERPROPERTY('ProductMajorVersion') AS nvarchar(20));";
        await using var command = new SqlCommand(sql, connection);
        var value = await command.ExecuteScalarAsync(cancellationToken);
        return Convert.ToString(value) ?? "1";
    }

    private static async Task<IReadOnlyList<object>> LoadSqlServerTableColumnsAsync(
        SqlConnection connection,
        SqlServerTableKey tableKey,
        CancellationToken cancellationToken)
    {
        var primaryKeyColumns = await LoadSqlServerKeyColumnsAsync(connection, tableKey, "PRIMARY KEY", cancellationToken);
        var foreignKeyColumns = await LoadSqlServerKeyColumnsAsync(connection, tableKey, "FOREIGN KEY", cancellationToken);

        const string sql = """
            SELECT COLUMN_NAME,
                   DATA_TYPE,
                   CHARACTER_MAXIMUM_LENGTH,
                   NUMERIC_PRECISION,
                   NUMERIC_SCALE,
                   IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @schema
              AND TABLE_NAME = @table
            ORDER BY ORDINAL_POSITION;
            """;

        var attributes = new List<object>();
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@schema", tableKey.Schema);
        command.Parameters.AddWithValue("@table", tableKey.Name);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var columnName = reader.GetString(0);
            var dataType = FormatSqlServerDatatype(
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetInt32(2),
                reader.IsDBNull(3) ? null : Convert.ToInt32(reader.GetByte(3)),
                reader.IsDBNull(4) ? null : Convert.ToInt32(reader.GetInt32(4)));

            attributes.Add(new
            {
                id = $"{tableKey.Schema}.{tableKey.Name}.{columnName}",
                name = columnName,
                physicalName = columnName,
                definition = "",
                datatype = dataType,
                comment = "",
                isPrimary = primaryKeyColumns.Contains(columnName),
                isFK = foreignKeyColumns.Contains(columnName),
                isNullable = string.Equals(reader.GetString(5), "YES", StringComparison.OrdinalIgnoreCase),
                physicalOnly = false,
                logicalOnly = false
            });
        }

        return attributes
            .OrderBy(item => GetSqlAttributeOrder(item))
            .ToList();
    }

    private static int GetSqlAttributeOrder(object attribute)
    {
        var isPrimary = (bool)attribute.GetType().GetProperty("isPrimary")!.GetValue(attribute)!;
        return isPrimary ? 0 : 1;
    }

    private static async Task<HashSet<string>> LoadSqlServerKeyColumnsAsync(
        SqlConnection connection,
        SqlServerTableKey tableKey,
        string constraintType,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT kcu.COLUMN_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
               AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
               AND tc.TABLE_NAME = kcu.TABLE_NAME
            WHERE tc.TABLE_SCHEMA = @schema
              AND tc.TABLE_NAME = @table
              AND tc.CONSTRAINT_TYPE = @constraintType;
            """;

        var columnNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@schema", tableKey.Schema);
        command.Parameters.AddWithValue("@table", tableKey.Name);
        command.Parameters.AddWithValue("@constraintType", constraintType);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            columnNames.Add(reader.GetString(0));
        }

        return columnNames;
    }

    private static string FormatSqlServerDatatype(
        string dataType,
        int? characterMaximumLength,
        int? numericPrecision,
        int? numericScale)
    {
        var normalized = dataType.ToLowerInvariant();
        return normalized switch
        {
            "varchar" or "nvarchar" or "char" or "nchar" or "binary" or "varbinary"
                when characterMaximumLength.HasValue
                => $"{normalized}({(characterMaximumLength.Value == -1 ? "max" : characterMaximumLength.Value)})",
            "decimal" or "numeric"
                when numericPrecision.HasValue && numericScale.HasValue
                => $"{normalized}({numericPrecision.Value},{numericScale.Value})",
            _ => normalized
        };
    }

    private static async Task<IReadOnlyList<SqlServerForeignKeyInfo>> LoadSqlServerForeignKeysAsync(
        SqlConnection connection,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT fk.name,
                   parent_schema.name AS parent_schema,
                   parent_table.name AS parent_table,
                   parent_column.name AS parent_column,
                   child_schema.name AS child_schema,
                   child_table.name AS child_table,
                   child_column.name AS child_column
            FROM sys.foreign_keys fk
            INNER JOIN sys.foreign_key_columns fkc
                ON fk.object_id = fkc.constraint_object_id
            INNER JOIN sys.tables parent_table
                ON fkc.referenced_object_id = parent_table.object_id
            INNER JOIN sys.schemas parent_schema
                ON parent_table.schema_id = parent_schema.schema_id
            INNER JOIN sys.columns parent_column
                ON parent_column.object_id = parent_table.object_id
               AND parent_column.column_id = fkc.referenced_column_id
            INNER JOIN sys.tables child_table
                ON fkc.parent_object_id = child_table.object_id
            INNER JOIN sys.schemas child_schema
                ON child_table.schema_id = child_schema.schema_id
            INNER JOIN sys.columns child_column
                ON child_column.object_id = child_table.object_id
               AND child_column.column_id = fkc.parent_column_id
            ORDER BY fk.name;
            """;

        var foreignKeys = new List<SqlServerForeignKeyInfo>();
        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            foreignKeys.Add(new SqlServerForeignKeyInfo(
                reader.GetString(0),
                new SqlServerTableKey(reader.GetString(1), reader.GetString(2)),
                reader.GetString(3),
                new SqlServerTableKey(reader.GetString(4), reader.GetString(5)),
                reader.GetString(6)));
        }

        return foreignKeys;
    }

    private static IReadOnlyList<object> InferMongoDbAttributes(
        IReadOnlyList<BsonDocument> sampleDocuments,
        SequentialIdAllocator idAllocator)
    {
        var inferredAttributes = new List<InferredMongoAttribute>();

        inferredAttributes.Add(new InferredMongoAttribute
        {
            Id = idAllocator.Next(),
            Name = "_id",
            DataType = "objectid",
            IsPrimary = true,
            IsNullable = false
        });

        foreach (var document in sampleDocuments)
        {
            if (document.TryGetValue("_id", out var idValue))
            {
                MergeMongoAttributeValue(inferredAttributes[0], idValue, idAllocator);
            }

            foreach (var element in document.Elements)
            {
                if (element.Name == "_id")
                {
                    continue;
                }

                MergeMongoAttribute(inferredAttributes, element.Name, element.Value, idAllocator);
            }
        }

        return inferredAttributes.Select(SerializeMongoAttribute).ToList();
    }

    private static void MergeMongoAttribute(
        List<InferredMongoAttribute> bucket,
        string fieldName,
        BsonValue value,
        SequentialIdAllocator idAllocator)
    {
        var attribute = bucket.FirstOrDefault(item => item.Name == fieldName);
        if (attribute is null)
        {
            attribute = new InferredMongoAttribute
            {
                Id = idAllocator.Next(),
                Name = fieldName,
                DataType = NormalizeMongoBsonType(value)
            };
            bucket.Add(attribute);
        }

        MergeMongoAttributeValue(attribute, value, idAllocator);
    }

    private static void MergeMongoAttributeValue(
        InferredMongoAttribute attribute,
        BsonValue value,
        SequentialIdAllocator idAllocator)
    {
        if (value is null || value.IsBsonNull)
        {
            attribute.IsNullable = true;
            return;
        }

        var nextType = NormalizeMongoBsonType(value);
        attribute.DataType = ResolveMergedMongoDatatype(attribute.DataType, nextType);

        if (value.BsonType == BsonType.Document)
        {
            foreach (var child in value.AsBsonDocument.Elements)
            {
                MergeMongoAttribute(attribute.Children, child.Name, child.Value, idAllocator);
            }
        }

        if (value.BsonType == BsonType.Array)
        {
            foreach (var childValue in value.AsBsonArray)
            {
                if (childValue.BsonType == BsonType.Document)
                {
                    var arrayItem = GetOrCreateArrayItemAttribute(attribute, "object", idAllocator);

                    foreach (var child in childValue.AsBsonDocument.Elements)
                    {
                        MergeMongoAttribute(arrayItem.Children, child.Name, child.Value, idAllocator);
                    }

                    continue;
                }

                if (childValue.BsonType == BsonType.Array)
                {
                    var arrayItem = GetOrCreateArrayItemAttribute(attribute, "array", idAllocator);
                    MergeMongoAttributeValue(arrayItem, childValue, idAllocator);
                }
            }
        }
    }

    private static InferredMongoAttribute GetOrCreateArrayItemAttribute(
        InferredMongoAttribute attribute,
        string itemDataType,
        SequentialIdAllocator idAllocator)
    {
        var arrayItem = attribute.Children.FirstOrDefault(child => child.Name == "[0]");
        if (arrayItem is null)
        {
            arrayItem = new InferredMongoAttribute
            {
                Id = idAllocator.Next(),
                Name = "[0]",
                DataType = itemDataType,
                IsNullable = false
            };
            attribute.Children.Add(arrayItem);
        }
        else
        {
            arrayItem.DataType = ResolveMergedMongoDatatype(arrayItem.DataType, itemDataType);
        }

        return arrayItem;
    }

    private static string NormalizeMongoBsonType(BsonValue value)
    {
        if (value is null || value.IsBsonNull)
        {
            return "null";
        }

        return value.BsonType switch
        {
            BsonType.Array => "array",
            BsonType.Document => "object",
            BsonType.String => "string",
            BsonType.Boolean => "boolean",
            BsonType.Int32 => "integer",
            BsonType.Int64 => "long",
            BsonType.Double => "double",
            BsonType.Decimal128 => "decimal",
            BsonType.DateTime => "date",
            BsonType.Timestamp => "timestamp",
            BsonType.ObjectId => "objectid",
            BsonType.Null => "null",
            BsonType.Binary => "binary",
            _ => value.BsonType.ToString().ToLowerInvariant()
        };
    }

    private static string ResolveMergedMongoDatatype(string currentType, string nextType)
    {
        if (string.IsNullOrWhiteSpace(currentType) || currentType == "null")
        {
            return nextType;
        }

        if (currentType == nextType || nextType == "null")
        {
            return currentType;
        }

        if ((currentType == "double" || currentType == "decimal" || currentType == "integer" || currentType == "long") &&
            (nextType == "double" || nextType == "decimal" || nextType == "integer" || nextType == "long"))
        {
            return "number";
        }

        return currentType;
    }

    private static object SerializeMongoAttribute(InferredMongoAttribute attribute)
    {
        return new
        {
            id = attribute.Id,
            name = attribute.Name,
            physicalName = "",
            definition = "",
            datatype = attribute.DataType,
            comment = "",
            isPrimary = attribute.IsPrimary,
            isFK = false,
            isNullable = attribute.IsNullable,
            physicalOnly = false,
            logicalOnly = false,
            children = attribute.Children.Count > 0
                ? attribute.Children.Select(SerializeMongoAttribute).ToList()
                : null
        };
    }

    private static MongoCollectionSample BuildMongoCollectionSample(
        string collectionName,
        string entityId,
        IReadOnlyList<BsonDocument> sampleDocuments,
        SequentialIdAllocator idAllocator)
    {
        var attributes = InferMongoDbAttributes(sampleDocuments, idAllocator);
        var rootIds = sampleDocuments
            .Where(document => document.TryGetValue("_id", out var idValue) && idValue.BsonType == BsonType.ObjectId)
            .Select(document => document["_id"].AsObjectId.ToString())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var referenceFields = sampleDocuments
            .SelectMany(document => CollectMongoReferenceFields(document))
            .GroupBy(item => item.Path, StringComparer.OrdinalIgnoreCase)
            .Select(group => new MongoReferenceField(
                group.Key,
                group.SelectMany(item => item.ObjectIdValues).Distinct(StringComparer.OrdinalIgnoreCase).ToList()))
            .ToList();

        return new MongoCollectionSample(collectionName, entityId, attributes, rootIds, referenceFields);
    }

    private static IEnumerable<MongoReferenceField> CollectMongoReferenceFields(
        BsonDocument document,
        string prefix = "")
    {
        foreach (var element in document.Elements)
        {
            var path = string.IsNullOrWhiteSpace(prefix) ? element.Name : $"{prefix}.{element.Name}";

            if (string.Equals(element.Name, "_id", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(prefix))
            {
                continue;
            }

            if (element.Value.BsonType == BsonType.ObjectId)
            {
                yield return new MongoReferenceField(path, new[] { element.Value.AsObjectId.ToString() });
                continue;
            }

            if (element.Value.BsonType == BsonType.Array)
            {
                var objectIdValues = element.Value.AsBsonArray
                    .Where(item => item.BsonType == BsonType.ObjectId)
                    .Select(item => item.AsObjectId.ToString())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                if (objectIdValues.Count > 0)
                {
                    yield return new MongoReferenceField(path, objectIdValues);
                }

                foreach (var arrayDocument in element.Value.AsBsonArray.Where(item => item.BsonType == BsonType.Document))
                {
                    foreach (var child in CollectMongoReferenceFields(arrayDocument.AsBsonDocument, path))
                    {
                        yield return child;
                    }
                }

                continue;
            }

            if (element.Value.BsonType == BsonType.Document)
            {
                foreach (var child in CollectMongoReferenceFields(element.Value.AsBsonDocument, path))
                {
                    yield return child;
                }
            }
        }
    }

    private static IReadOnlyList<MongoRelationshipSample> InferMongoCollectionRelationships(
        IReadOnlyList<MongoCollectionSample> collectionSamples,
        SequentialIdAllocator idAllocator)
    {
        var relationships = new List<MongoRelationshipSample>();

        foreach (var childSample in collectionSamples)
        {
            foreach (var referenceField in childSample.ReferenceFields)
            {
                var bestParent = collectionSamples
                    .Where(parentSample => parentSample.EntityId != childSample.EntityId && parentSample.RootObjectIds.Count > 0)
                    .Select(parentSample => new
                    {
                        Parent = parentSample,
                        MatchCount = referenceField.ObjectIdValues.Count(value => parentSample.RootObjectIds.Contains(value))
                    })
                    .Where(candidate => candidate.MatchCount > 0)
                    .OrderByDescending(candidate => candidate.MatchCount)
                    .ThenBy(candidate => candidate.Parent.CollectionName, StringComparer.OrdinalIgnoreCase)
                    .FirstOrDefault();

                if (bestParent is null)
                {
                    continue;
                }

                relationships.Add(new MongoRelationshipSample(
                    idAllocator.Next(),
                    $"FK_{bestParent.Parent.CollectionName}_{childSample.CollectionName}_{SlugifyRelationshipPath(referenceField.Path)}",
                    bestParent.Parent.EntityId,
                    childSample.EntityId,
                    "_id",
                    referenceField.Path,
                    "1:N",
                    $"References {bestParent.Parent.CollectionName}._id"));
            }
        }

        return relationships;
    }

    private static string SlugifyRelationshipPath(string path)
    {
        var filtered = new string(
            path
                .Select(character => char.IsLetterOrDigit(character) ? character : '_')
                .ToArray());

        return string.IsNullOrWhiteSpace(filtered) ? "ref" : filtered;
    }

    private sealed class InferredMongoAttribute
    {
        public required string Id { get; init; }
        public required string Name { get; init; }
        public required string DataType { get; set; }
        public bool IsPrimary { get; set; }
        public bool IsNullable { get; set; }
        public List<InferredMongoAttribute> Children { get; } = new();
    }

    private sealed record MongoReferenceField(string Path, IReadOnlyList<string> ObjectIdValues);

    private sealed record MongoCollectionSample(
        string CollectionName,
        string EntityId,
        IReadOnlyList<object> Attributes,
        HashSet<string> RootObjectIds,
        IReadOnlyList<MongoReferenceField> ReferenceFields);

    private sealed record MongoRelationshipSample(
        string Id,
        string Name,
        string ParentEntityId,
        string ChildEntityId,
        string ParentAttribute,
        string ChildAttribute,
        string Cardinality,
        string Description);

    private sealed record SqlServerTableKey(string Schema, string Name);

    private sealed record SqlServerForeignKeyInfo(
        string Name,
        SqlServerTableKey ParentTable,
        string ParentColumn,
        SqlServerTableKey ChildTable,
        string ChildColumn);

    private sealed class RelationshipRefs
    {
        public List<string> ParentIds { get; } = new();
        public List<string> ChildIds { get; } = new();
    }

    private sealed class SequentialIdAllocator
    {
        private int _next = 1;

        public string Next() => (_next++).ToString();
    }
}
