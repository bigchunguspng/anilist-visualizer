using API.Objects;
using API.Services;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController, Route("api/[controller]")]
public class ActivitiesController : ControllerBase
{
    private readonly ActivitiesService _service;

    public ActivitiesController(ActivitiesService service)
    {
        _service = service;
    }

    [HttpGet("{userId:int}/{mediaId:int}")]
    public async Task<ActionResult<ListActivity>> Get(int userId, int mediaId)
    {
        try
        {
            var activities = await _service.GetActivities(userId, mediaId);
            //UpdateActivitiesCache(user);
            //LogActivities(user);
            return Ok(activities);
        }
        catch (Exception e)
        {
            //LogException(e);
            return NotFound();
        }
    }
}