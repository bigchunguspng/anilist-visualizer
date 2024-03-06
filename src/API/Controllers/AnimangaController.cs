using AniListNet;
using AniListNet.Objects;
using AniListNet.Parameters;
using API.Objects;
using API.Services;
using API.Services.Cache;
using Microsoft.AspNetCore.Mvc;
using MediaEntry = API.Objects.MediaEntry;
using User = API.Objects.User;
using Date = API.Objects.Date;

namespace API.Controllers;

[ApiController, Route("api/[controller]")]
public class AnimangaController : ControllerBase
{
    private readonly ILogger<AnimangaController> _logger;
    private readonly AniClient _client;
    private readonly Cache<User> _userCache;
    private readonly Cache<List<MediaEntry>> _entryCache;

    public AnimangaController
    (
        ILogger<AnimangaController> logger,
        AniClient client,
        Cache<User> userCache,
        Cache<List<MediaEntry>> entryCache
    )
    {
        _logger = logger;
        _client = client;
        _userCache = userCache;
        _entryCache = entryCache;
    }

    /// <summary>
    /// Returns all user entries, exept for PLANNING ones, from oldest to newest.
    /// </summary>
    [HttpGet("{userId:int}")]
    public async Task<ActionResult<Animanga>> Get(int userId)
    {
        try
        {
            var userCache =  _userCache.GetNodeOrNull(userId);
            var listCache = _entryCache.GetNodeOrNull(userId);

            if (listCache != null && userCache != null && userCache.IsNotYoungerThan(listCache))
            {
                return new Animanga(listCache.Data);
            }

            var entries = await GetEntries(userId);

            _logger.LogInformation("USER: [{id}] ENTRIES: [{count}]", userId, entries.Count);

            var updatedAt = userCache?.UpdatedAt ?? Helpers.DateTimeToUnixTimeStamp(DateTime.Now);
            _entryCache.Update(userId, entries, updatedAt);

            return Ok(new Animanga(entries));
        }
        catch (Exception)
        {
            return NotFound();
        }
    }

    private async Task<List<MediaEntry>> GetEntries(int userId)
    {
        var resluts = new List<MediaEntry>();

        var tasks = Statuses.Select(status => GetEntriesByStatus(userId, status));

        foreach (var result in await Task.WhenAll(tasks))
        {
            resluts.AddRange(result);
        }

        var list = resluts.DistinctBy(x => x.Id).ToList();

        GroupBySeries(list);
        Minimize(list);

        return list
            .OrderBy(x => x.StartDate)
            .ThenBy(x => x.CompleteDate)
            .ThenBy(x => x.Id).ToList();
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

    private static void GroupBySeries(List<MediaEntry> list)
    {
        foreach (var entry in list) entry.Media.PopulateRelated();

        var relations = list.ToDictionary(x => x.Media.Id, x => x.Media.GetRelations());

        // get missing relations
        foreach (var relation in relations)
        {
            if (relation.Value.Count == 0) continue;

            // relations (except this title) that has matching relations
            var related = relations.Where(x => x.Key != relation.Key && x.Value.Overlaps(relation.Value));
            foreach (var link in related)
            {
                relation.Value.UnionWith(link.Value);
                relations[link.Key].Clear();
            }
        }

        SetSeriesId(list, relations.Values);
    }

    private static void SetSeriesId(List<MediaEntry> list, IEnumerable<HashSet<int>> sets)
    {
        var media = list.ToDictionary(x => x.Media.Id, x => x.Media);

        foreach (var set in sets.Where(set => set.Count > 0))
        {
            var series = set.Min();
            foreach (var id in set.Where(id => media.ContainsKey(id)))
            {
                media[id].SeriesId = series;
            }
        }
    }

    private static void Minimize(List<MediaEntry> list)
    {
        foreach (var entry in list)
        {
            if (Date.IsNull(entry.StartDate))
                entry.StartDate = null;

            if (Date.IsNull(entry.CompleteDate))
                entry.CompleteDate = null;

            entry.FixDates();

            if (Date.IsNull(entry.Media.EndDate))
                entry.Media.EndDate = null;

            entry.Media.Cover.FixUrls();
        }
    }
}