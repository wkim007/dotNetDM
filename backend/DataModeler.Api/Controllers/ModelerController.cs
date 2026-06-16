using DataModeler.Api.Services;
using DataModeler.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace DataModeler.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ModelerController : ControllerBase
{
    private readonly IModelerService _modelerService;
    private readonly ISchemaIntrospectionService _schemaIntrospectionService;

    public ModelerController(
        IModelerService modelerService,
        ISchemaIntrospectionService schemaIntrospectionService)
    {
        _modelerService = modelerService;
        _schemaIntrospectionService = schemaIntrospectionService;
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
}
