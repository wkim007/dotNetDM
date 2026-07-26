using DataModeler.Api.Services;
using DataModeler.Api.Models;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace DataModeler.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ModelerController : ControllerBase
{
    private readonly IModelerService _modelerService;
    private readonly ISchemaIntrospectionService _schemaIntrospectionService;
    private readonly IHttpClientFactory _httpClientFactory;

    public ModelerController(
        IModelerService modelerService,
        ISchemaIntrospectionService schemaIntrospectionService,
        IHttpClientFactory httpClientFactory)
    {
        _modelerService = modelerService;
        _schemaIntrospectionService = schemaIntrospectionService;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("diagram")]
    public async Task<IActionResult> GetDiagram(CancellationToken cancellationToken)
    {
        return Ok(await _modelerService.GetDiagramAsync(cancellationToken));
    }

    [HttpPost("diagram")]
    public async Task<IActionResult> SaveDiagram([FromBody] SaveDiagramRequest request, CancellationToken cancellationToken)
    {
        var savedDiagram = await _modelerService.SaveDiagramAsync(request.Diagram, cancellationToken);
        return Ok(savedDiagram);
    }

    [HttpGet("providers")]
    public IActionResult GetProviders()
    {
        return Ok(_modelerService.GetProviders());
    }

    [HttpPost("introspect")]
    public async Task<IActionResult> Introspect([FromBody] IntrospectionRequest request, CancellationToken cancellationToken)
    {
        var response = await _schemaIntrospectionService.InspectAsync(request, cancellationToken);
        await _modelerService.SaveDiagramAsync(response.Diagram, cancellationToken);
        return Ok(response);
    }

    [HttpPost("reverse-engineer/databases")]
    public async Task<IActionResult> ReverseEngineerDatabases([FromBody] ReverseEngineeringRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _schemaIntrospectionService.DiscoverDatabasesAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (Exception exception)
        {
            return Problem(
                detail: exception.Message,
                title: "Reverse engineering connection failed",
                statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpPost("reverse-engineer/collections")]
    public async Task<IActionResult> ReverseEngineerCollections(
        [FromBody] ReverseEngineeringCollectionsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _schemaIntrospectionService.DiscoverCollectionsAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (Exception exception)
        {
            return Problem(
                detail: exception.Message,
                title: "Reverse engineering collection discovery failed",
                statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpPost("reverse-engineer/run")]
    public async Task<IActionResult> ReverseEngineerRun(
        [FromBody] ReverseEngineeringRunRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _schemaIntrospectionService.ReverseEngineerAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (Exception exception)
        {
            return Problem(
                detail: exception.Message,
                title: "Reverse engineering run failed",
                statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpPost("ai/validate")]
    public async Task<IActionResult> ValidateAiSettings(
        [FromBody] AiValidationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (!string.Equals(request.Engine, "Azure OpenAI", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only Azure OpenAI validation is currently supported.");
            }

            if (string.IsNullOrWhiteSpace(request.Endpoint))
            {
                throw new InvalidOperationException("Endpoint is required.");
            }

            if (string.IsNullOrWhiteSpace(request.ApiKey))
            {
                throw new InvalidOperationException("API key is required.");
            }

            if (string.IsNullOrWhiteSpace(request.ApiVersion))
            {
                throw new InvalidOperationException("API version is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Deployment))
            {
                throw new InvalidOperationException("API deployment is required.");
            }

            var endpoint = request.Endpoint.Trim().TrimEnd('/');
            var requestUri =
                $"{endpoint}/openai/deployments/{Uri.EscapeDataString(request.Deployment.Trim())}/chat/completions?api-version={Uri.EscapeDataString(request.ApiVersion.Trim())}";

            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(20);

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, requestUri);
            httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            httpRequest.Headers.Add("api-key", request.ApiKey.Trim());
            httpRequest.Content = new StringContent(
                JsonSerializer.Serialize(new
                {
                    messages = new[]
                    {
                        new
                        {
                            role = "user",
                            content = "ping"
                        }
                    },
                    max_completion_tokens = 1
                }),
                Encoding.UTF8,
                "application/json");

            using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"Azure OpenAI validation failed ({(int)response.StatusCode} {response.ReasonPhrase}). {ExtractAzureOpenAiErrorMessage(responseBody)}");
            }

            return Ok(new AiValidationResponse
            {
                IsValid = true,
                Message = "Azure OpenAI settings validated successfully."
            });
        }
        catch (Exception exception)
        {
            return Problem(
                detail: exception.Message,
                title: "AI settings validation failed",
                statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpPost("ai/generate")]
    public async Task<IActionResult> GenerateAiModel(
        [FromBody] AiGenerateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (!string.Equals(request.Engine, "Azure OpenAI", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only Azure OpenAI generation is currently supported.");
            }

            if (string.IsNullOrWhiteSpace(request.Prompt))
            {
                throw new InvalidOperationException("Schema description is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Endpoint))
            {
                throw new InvalidOperationException("Endpoint is required.");
            }

            if (string.IsNullOrWhiteSpace(request.ApiKey))
            {
                throw new InvalidOperationException("API key is required.");
            }

            if (string.IsNullOrWhiteSpace(request.ApiVersion))
            {
                throw new InvalidOperationException("API version is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Deployment))
            {
                throw new InvalidOperationException("API deployment is required.");
            }

            var aiPayload = await RequestAzureOpenAiSchemaAsync(request, cancellationToken);
            var modelJson = BuildWorkspaceJsonFromAiPayload(aiPayload, request.Database, request.DatabaseVersion);

            return Ok(new AiGenerateResponse
            {
                Message = "AI model generated.",
                ModelJson = modelJson
            });
        }
        catch (Exception exception)
        {
            return Problem(
                detail: exception.Message,
                title: "AI generation failed",
                statusCode: StatusCodes.Status400BadRequest);
        }
    }

    private static string ExtractAzureOpenAiErrorMessage(string? responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return "No additional error details were returned.";
        }

        try
        {
            using var document = JsonDocument.Parse(responseBody);
            if (document.RootElement.TryGetProperty("error", out var errorElement))
            {
                if (errorElement.TryGetProperty("message", out var messageElement))
                {
                    var message = messageElement.GetString();
                    if (!string.IsNullOrWhiteSpace(message))
                    {
                        return message;
                    }
                }
            }
        }
        catch
        {
        }

        return responseBody.Length > 300 ? responseBody[..300] : responseBody;
    }

    private async Task<JsonObject> RequestAzureOpenAiSchemaAsync(
        AiGenerateRequest request,
        CancellationToken cancellationToken)
    {
        var endpoint = request.Endpoint.Trim().TrimEnd('/');
        var requestUri =
            $"{endpoint}/openai/deployments/{Uri.EscapeDataString(request.Deployment.Trim())}/chat/completions?api-version={Uri.EscapeDataString(request.ApiVersion.Trim())}";

        var schema = BuildAiSchemaDefinition(request.Database);
        var databaseLabel = string.IsNullOrWhiteSpace(request.Database) ? "PostgreSQL" : request.Database.Trim();

        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(60);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, requestUri);
        httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpRequest.Headers.Add("api-key", request.ApiKey.Trim());
        httpRequest.Content = new StringContent(
            JsonSerializer.Serialize(new
            {
                messages = new object[]
                {
                    new
                    {
                        role = "system",
                        content =
                            "You are a data model generator. Return only JSON that matches the provided schema. Generate realistic entity comments and attribute comments. Ensure primary keys appear first in each entity. Prefer concise, conventional database naming."
                    },
                    new
                    {
                        role = "user",
                        content =
                            $"Generate a {databaseLabel} schema model from this description: {request.Prompt.Trim()}. Include entities, attributes, and relationships."
                    }
                },
                temperature = 0.3,
                max_completion_tokens = 4000,
                response_format = new
                {
                    type = "json_schema",
                    json_schema = new
                    {
                        name = "schema_model",
                        strict = true,
                        schema
                    }
                }
            }),
            Encoding.UTF8,
            "application/json");

        using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Azure OpenAI generation failed ({(int)response.StatusCode} {response.ReasonPhrase}). {ExtractAzureOpenAiErrorMessage(responseBody)}");
        }

        JsonNode? rootNode;

        try
        {
            rootNode = JsonNode.Parse(responseBody);
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException($"Azure OpenAI returned an unreadable response. {exception.Message}");
        }

        var contentValue = rootNode?["choices"]?[0]?["message"]?["content"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(contentValue))
        {
            throw new InvalidOperationException("Azure OpenAI returned no schema content.");
        }

        try
        {
            var parsed = JsonNode.Parse(contentValue) as JsonObject;
            return parsed ?? throw new InvalidOperationException("Azure OpenAI returned JSON in an unexpected shape.");
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException($"Azure OpenAI returned invalid schema JSON. {exception.Message}");
        }
    }

    private static object BuildAiSchemaDefinition(string? database)
    {
        var types = GetAllowedDatabaseTypes(database);

        return new
        {
            type = "object",
            additionalProperties = false,
            properties = new
            {
                entities = new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        additionalProperties = false,
                        properties = new
                        {
                            name = new { type = "string" },
                            physicalName = new { type = "string" },
                            comment = new { type = "string" },
                            attributes = new
                            {
                                type = "array",
                                items = new
                                {
                                    type = "object",
                                    additionalProperties = false,
                                    properties = new
                                    {
                                        name = new { type = "string" },
                                        physicalName = new { type = "string" },
                                        datatype = new { type = "string", @enum = types },
                                        comment = new { type = "string" },
                                        isPrimary = new { type = "boolean" },
                                        isNullable = new { type = "boolean" },
                                        isForeignKey = new { type = "boolean" }
                                    },
                                    required = new[] { "name", "physicalName", "datatype", "comment", "isPrimary", "isNullable", "isForeignKey" }
                                }
                            }
                        },
                        required = new[] { "name", "physicalName", "comment", "attributes" }
                    }
                },
                relationships = new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        additionalProperties = false,
                        properties = new
                        {
                            parent = new { type = "string" },
                            child = new { type = "string" },
                            cardinality = new { type = "string", @enum = new[] { "1:1", "1:N", "N:N" } },
                            physicalName = new { type = "string" },
                            label = new { type = "string" },
                            relationshipType = new { type = "string", @enum = new[] { "2", "7" } },
                            parentToChildVerbPhrase = new { type = "string" },
                            childToParentVerbPhrase = new { type = "string" }
                        },
                        required = new[] { "parent", "child", "cardinality", "physicalName", "label", "relationshipType", "parentToChildVerbPhrase", "childToParentVerbPhrase" }
                    }
                }
            },
            required = new[] { "entities", "relationships" }
        };
    }

    private static string[] GetAllowedDatabaseTypes(string? database)
    {
        var normalized = string.IsNullOrWhiteSpace(database)
            ? "postgresql"
            : database.Trim().ToLowerInvariant();

        if (normalized.Contains("sql server") || normalized.Contains("ms sql") || normalized == "mssql")
        {
            return ["bit", "tinyint", "smallint", "int", "bigint", "decimal", "numeric", "money", "float", "real", "char", "varchar", "nchar", "nvarchar", "text", "date", "time", "datetime", "datetime2", "uniqueidentifier", "xml", "json"];
        }

        if (normalized.Contains("oracle"))
        {
            return ["number", "decimal", "numeric", "integer", "int", "smallint", "real", "varchar2", "nvarchar2", "char", "nchar", "float", "binary_float", "binary_double", "date", "timestamp", "clob", "blob", "raw", "xmltype", "json"];
        }

        if (normalized.Contains("mongo"))
        {
            return ["string", "integer", "long", "double", "decimal", "boolean", "date", "timestamp", "objectId", "object", "array", "null"];
        }

        return ["smallint", "integer", "bigint", "decimal", "numeric", "real", "double precision", "serial", "bigserial", "money", "char", "varchar", "text", "boolean", "date", "time", "timestamp", "uuid", "json", "jsonb", "bytea"];
    }

    private static string BuildWorkspaceJsonFromAiPayload(JsonObject aiPayload, string? database, string? databaseVersion)
    {
        var dbMeta = ResolveDbMeta(database, databaseVersion);
        var entityArray = aiPayload["entities"] as JsonArray ?? [];
        var relationshipArray = aiPayload["relationships"] as JsonArray ?? [];

        var nextId = 1;
        string AllocateId() => (nextId++).ToString();

        var entityIds = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var entities = new JsonArray();
        var shapes = new JsonArray();

        var row = 0;
        var col = 0;
        const int startX = 120;
        const int startY = 120;
        const int gapX = 320;
        const int gapY = 240;
        const int columns = 3;

        foreach (var entityNode in entityArray.OfType<JsonObject>())
        {
            var entityId = AllocateId();
            var entityName = entityNode["name"]?.GetValue<string>()?.Trim();

            if (string.IsNullOrWhiteSpace(entityName))
            {
                continue;
            }

            entityIds[entityName] = entityId;

            var physicalName = entityNode["physicalName"]?.GetValue<string>()?.Trim();
            if (string.IsNullOrWhiteSpace(physicalName))
            {
                physicalName = ToPhysicalName(entityName);
            }

            var attributes = new JsonArray();
            var attributeNodes = (entityNode["attributes"] as JsonArray ?? [])
                .OfType<JsonObject>()
                .OrderByDescending(attribute => attribute["isPrimary"]?.GetValue<bool>() == true)
                .ToList();

            foreach (var attributeNode in attributeNodes)
            {
                var attributeName = attributeNode["name"]?.GetValue<string>()?.Trim();
                if (string.IsNullOrWhiteSpace(attributeName))
                {
                    continue;
                }

                var attributePhysicalName = attributeNode["physicalName"]?.GetValue<string>()?.Trim();
                if (string.IsNullOrWhiteSpace(attributePhysicalName))
                {
                    attributePhysicalName = ToPhysicalName(attributeName);
                }

                attributes.Add(new JsonObject
                {
                    ["id"] = AllocateId(),
                    ["name"] = attributeName,
                    ["physicalName"] = attributePhysicalName,
                    ["definition"] = "",
                    ["datatype"] = NormalizeDatatype(attributeNode["datatype"]?.GetValue<string>()),
                    ["comment"] = attributeNode["comment"]?.GetValue<string>() ?? "",
                    ["isPrimary"] = attributeNode["isPrimary"]?.GetValue<bool>() ?? false,
                    ["isFK"] = attributeNode["isForeignKey"]?.GetValue<bool>() ?? false,
                    ["isNullable"] = attributeNode["isNullable"]?.GetValue<bool>() ?? true,
                    ["physicalOnly"] = false,
                    ["logicalOnly"] = false
                });
            }

            entities.Add(new JsonObject
            {
                ["id"] = entityId,
                ["name"] = entityName,
                ["physicalName"] = physicalName,
                ["definition"] = "",
                ["comment"] = entityNode["comment"]?.GetValue<string>() ?? "",
                ["physicalOnly"] = false,
                ["logicalOnly"] = false,
                ["indexes"] = new JsonArray(),
                ["attributes"] = attributes,
                ["props"] = new JsonObject
                {
                    ["pParentRelationshipsRef"] = new JsonArray(),
                    ["pChildRelationshipsRef"] = new JsonArray()
                }
            });

            shapes.Add(new JsonObject
            {
                ["id"] = entityId,
                ["name"] = entityName,
                ["physicalName"] = physicalName,
                ["displayLevelLogical"] = "-1",
                ["displayLevelPhysical"] = "-1",
                ["x"] = startX + (col * gapX),
                ["y"] = startY + (row * gapY),
                ["width"] = 280,
                ["height"] = 0
            });

            col++;
            if (col >= columns)
            {
                col = 0;
                row++;
            }
        }

        var relationships = new JsonArray();
        var relationshipShapes = new JsonArray();

        foreach (var relationshipNode in relationshipArray.OfType<JsonObject>())
        {
            var parentName = relationshipNode["parent"]?.GetValue<string>()?.Trim();
            var childName = relationshipNode["child"]?.GetValue<string>()?.Trim();

            if (string.IsNullOrWhiteSpace(parentName) || string.IsNullOrWhiteSpace(childName))
            {
                continue;
            }

            if (!entityIds.TryGetValue(parentName, out var parentId) || !entityIds.TryGetValue(childName, out var childId))
            {
                continue;
            }

            var relationshipId = AllocateId();
            var physicalName = relationshipNode["physicalName"]?.GetValue<string>()?.Trim();
            if (string.IsNullOrWhiteSpace(physicalName))
            {
                physicalName = ToPhysicalName($"{parentName}_{childName}");
            }

            var cardinality = NormalizeCardinality(relationshipNode["cardinality"]?.GetValue<string>());

            relationships.Add(new JsonObject
            {
                ["id"] = relationshipId,
                ["name"] = $"R/{relationshipId}",
                ["physicalName"] = physicalName,
                ["definition"] = "",
                ["description"] = relationshipNode["label"]?.GetValue<string>() ?? "relates_to",
                ["parent"] = parentId,
                ["child"] = childId,
                ["parentAttribute"] = "Entity header",
                ["childAttribute"] = "Entity header",
                ["cardinality"] = cardinality,
                ["relationshipType"] = relationshipNode["relationshipType"]?.GetValue<string>() ?? "7",
                ["parentToChildVerbPhrase"] = relationshipNode["parentToChildVerbPhrase"]?.GetValue<string>() ?? "",
                ["childToParentVerbPhrase"] = relationshipNode["childToParentVerbPhrase"]?.GetValue<string>() ?? "",
                ["physicalOnly"] = false,
                ["logicalOnly"] = false,
                ["props"] = new JsonObject()
            });

            relationshipShapes.Add(new JsonObject
            {
                ["id"] = relationshipId,
                ["name"] = $"R/{relationshipId}",
                ["physicalName"] = physicalName,
                ["lineOffsetX"] = 0,
                ["lineOffsetY"] = 0
            });
        }

        var workspace = new JsonObject
        {
            ["entities"] = entities,
            ["views"] = new JsonArray(),
            ["cachedViews"] = new JsonArray(),
            ["relationships"] = relationships,
            ["schemas"] = new JsonArray
            {
                new JsonObject
                {
                    ["id"] = "1",
                    ["name"] = dbMeta.Schema,
                    ["comment"] = ""
                }
            },
            ["databases"] = new JsonArray(),
            ["catalogs"] = new JsonArray(),
            ["subjectAreas"] = new JsonArray
            {
                new JsonObject
                {
                    ["id"] = "1",
                    ["name"] = "<model>",
                    ["locked"] = true,
                    ["diagrams"] = new JsonArray
                    {
                        new JsonObject
                        {
                            ["id"] = "1",
                            ["name"] = "ER_Diagram_1",
                            ["definition"] = "",
                            ["displayLevelLogical"] = "1",
                            ["displayLevelPhysical"] = "1",
                            ["modelShapes"] = new JsonObject
                            {
                                ["entities"] = shapes,
                                ["views"] = new JsonArray(),
                                ["cachedViews"] = new JsonArray(),
                                ["relationships"] = relationshipShapes,
                                ["Shapes"] = new JsonArray(),
                                ["Annotations"] = new JsonArray()
                            }
                        }
                    }
                }
            }
        };

        var payload = new JsonObject
        {
            ["meta"] = new JsonObject
            {
                ["db"] = dbMeta.Db,
                ["dbMajorVersion"] = dbMeta.Major,
                ["dbMinorVersion"] = dbMeta.Minor,
                ["modelType"] = "3",
                ["viewMode"] = "physical",
                ["activeSubjectAreaId"] = "1",
                ["activeDiagramId"] = "1",
                ["nextDiagramSeq"] = 2,
                ["nextSubjectAreaSeq"] = 1
            },
            ["workspace"] = workspace
        };

        return payload.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = true
        });
    }

    private static (string Db, string Major, string Minor, string Schema) ResolveDbMeta(string? database, string? databaseVersion)
    {
        var normalized = string.IsNullOrWhiteSpace(database)
            ? "postgresql"
            : database.Trim().ToLowerInvariant();

        var versionText = string.IsNullOrWhiteSpace(databaseVersion) ? "1.0" : databaseVersion.Trim();
        var major = versionText;
        var minor = "0";

        var dotIndex = versionText.IndexOf('.');
        if (dotIndex >= 0)
        {
            major = versionText[..dotIndex];
            minor = dotIndex < versionText.Length - 1 ? versionText[(dotIndex + 1)..] : "0";
        }

        if (normalized.Contains("sql server") || normalized.Contains("ms sql") || normalized == "mssql")
        {
            return ("1075859016", major, minor, "dbo");
        }

        if (normalized.Contains("oracle"))
        {
            return ("1075858979", major, minor, "dbo");
        }

        if (normalized.Contains("mongo"))
        {
            return ("1075859196", major, minor, "public");
        }

        return ("1075859235", major, minor, "public");
    }

    private static string ToPhysicalName(string value)
    {
        var builder = new StringBuilder();
        foreach (var character in value)
        {
            if (char.IsLetterOrDigit(character))
            {
                builder.Append(character);
            }
            else if (builder.Length == 0 || builder[^1] != '_')
            {
                builder.Append('_');
            }
        }

        return builder.ToString().Trim('_');
    }

    private static string NormalizeDatatype(string? datatype)
    {
        return string.IsNullOrWhiteSpace(datatype)
            ? "varchar"
            : datatype.Trim().ToLowerInvariant();
    }

    private static string NormalizeCardinality(string? value)
    {
        return string.Equals(value?.Trim(), "N:N", StringComparison.OrdinalIgnoreCase)
            ? "N:N"
            : string.Equals(value?.Trim(), "1:1", StringComparison.OrdinalIgnoreCase)
                ? "1:1"
                : "1:N";
    }
}
