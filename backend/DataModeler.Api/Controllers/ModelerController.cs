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
}
