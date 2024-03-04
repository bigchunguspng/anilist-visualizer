using AniListNet;
using AniListNet.Objects;
using AniListNet.Parameters;
using Microsoft.AspNetCore.Mvc;
using MediaEntry = API.Objects.MediaEntry;

namespace API.Controllers;

[ApiController, Route("api/[controller]")]
public class AnimangaController : ControllerBase
{
    private readonly AniClient _client;

    public AnimangaController(AniClient client)
    {
        _client = client;
    }

    /// <summary>
    /// Returns all user entries, exept for PLANNING ones, from oldest to newest.
    /// </summary>
    [HttpGet("{userId:int}")]
    public async Task<ActionResult<IEnumerable<MediaEntry>>> Get(int userId)
    {
        try
        {
            var list = new List<MediaEntry>();
            
            var tasks = Statuses.Select(status => GetEntriesByStatus(userId, status)).ToArray();

            foreach (var result in await Task.WhenAll(tasks))
            {
                list.AddRange(result);
            }

            return Ok(list.OrderBy(x => x.StartDate).ThenBy(x => x.CompleteDate).ThenBy(x => x.Id));
        }
        catch (Exception)
        {
            return NotFound();
        }
    }

    private static readonly MediaEntryStatus[] Statuses =
    {
        MediaEntryStatus.Current,
        MediaEntryStatus.Completed,
        MediaEntryStatus.Dropped,
        MediaEntryStatus.Paused,
        MediaEntryStatus.Repeating
    };

    private async Task<List<MediaEntry>> GetEntriesByStatus(int userId, MediaEntryStatus status, int page = 1)
    {
        var list = new List<MediaEntry>();
        var filter = new MediaEntryFilter
        {
            Status = status,
            Sort = MediaEntrySort.StartedDate, SortDescending = false
        };

        var done = false;
        while (!done)
        {
            var pagination = new AniPaginationOptions(page, 50);
            var entries = await GetUserEntriesAsync(userId, filter, pagination);

            list.AddRange(entries.Data);

            if (entries.HasNextPage) page++;
            else done = true;
        }

        return list;
    }

    private Task<AniPagination<MediaEntry>> GetUserEntriesAsync(int userId, MediaEntryFilter filter, AniPaginationOptions options)
    {
        var parameters = _client.GetUserIdParams(userId).Concat(filter.ToParameters());
        return _client.GetPaginatedAsync<MediaEntry>(parameters, "mediaList", options);
    }
}