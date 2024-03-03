using AniListNet;
using AniListNet.Objects;
using AniListNet.Parameters;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController, Route("api/[controller]")]
public class AnimangaController : ControllerBase
{
    private readonly AniClient _client;

    public AnimangaController(AniClient client)
    {
        _client = client;
    }

    [HttpGet("{userId:int}")]
    public async Task<ActionResult<IEnumerable<MediaEntry>>> Get(int userId)
    {
        try
        {
            var list = new List<MediaEntry>();

            var filter = new MediaEntryFilter
            {
                Sort = MediaEntrySort.StartedDate, Status = MediaEntryStatus.Completed
            };
            var pagination = new AniPaginationOptions(1, 50);
            
            var enough = false;
            while (!enough)
            {
                var entries = await _client.GetUserEntriesAsync(userId, filter, pagination);

                list.AddRange(entries.Data);

                if (entries.HasNextPage)
                {
                    pagination = new AniPaginationOptions(pagination.PageIndex + 1, 50);
                }
                else
                    enough = true;
            }

            return Ok(list);
        }
        catch (Exception)
        {
            return NotFound();
        }
    }
}