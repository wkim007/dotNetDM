using DataModeler.Api.Services;
using DataModeler.Api.Models;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

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
}
