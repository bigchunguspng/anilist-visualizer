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
public class AnimangaController : ControllerWithLogger
{
    private readonly AniClient _client;
    private readonly Cache<User> _userCache;
    private readonly Cache<List<MediaEntry>> _entryCache;

    public AnimangaController
    (
        ILogger<AnimangaController> logger,
        AniClient client,
        Cache<User> userCache,
        Cache<List<MediaEntry>> entryCache
    ) : base(logger)
    {
        _client = client;
        _userCache = userCache;
        _entryCache = entryCache;
    }

    /// <summary>
    /// Returns all user entries, except for PLANNING ones, from oldest to newest.
    /// </summary>
    [HttpGet("{userId:int}")]
    public async Task<ActionResult<Animanga>> Get(int userId)
    {
        return await GetAnimangaInternal(userId, null, null);
    }

    /// <summary>
    /// Returns all user entries for the selected years, except for PLANNING ones, from oldest to newest.
    /// </summary>
    [HttpGet("{userId:int}/{from:int}/{to:int}")]
    public async Task<ActionResult<Animanga>> Get(int userId, int from, int to)
    {
        if (to < from) (from, to) = (to, from);

        return await GetAnimangaInternal(userId, from, to);
    }

    private async Task<ActionResult<Animanga>> GetAnimangaInternal(int userId, int? from, int? to)
    {
        try
        {
            var userCache =  _userCache.GetNodeOrNull(userId);
            var listCache = _entryCache.GetNodeOrNull(userId);

            if (listCache != null)
            {
                if (userCache != null)
                {
                    if (userCache.IsNotYoungerThan(listCache))
                    {
                        return new Animanga(listCache.Data, from, to);
                    }
                }
                else if (listCache.UpdatedAt > Helpers.GetDateTimeMinutesAgo(15))
                {
                    return new Animanga(listCache.Data, from, to);
                }
            }

            var entries = await GetEntriesAsync(userId);

            var updatedAt = userCache?.UpdatedAt ?? DateTime.Now.ToUnixTimeStamp();
            _entryCache.Update(userId, entries, updatedAt);

            LogEntries(userId, entries.Count);
            return Ok(new Animanga(entries, from, to));
        }
        catch (Exception e)
        {
            LogException(e);
            return BadRequest();
        }
    }

    private void LogEntries(int userId, int count)
    {
        Logger.LogInformation("USER: [{id}] ENTRIES: {count}", userId, count);
    }

    private async Task<List<MediaEntry>> GetEntriesAsync(int userId)
    {
        var results = new List<MediaEntry>();

        var tasks = Statuses.Select(status => GetEntriesByStatusAsync(userId, status));

        foreach (var result in await Task.WhenAll(tasks))
        {
            results.AddRange(result);
        }

        var entries = results.DistinctBy(x => x.Media.Id).ToList();

        GroupBySeries(entries);
        MinimizeData(entries);

        return entries
            .OrderBy(x => x.StartDate)
            .ThenBy(x => x.CompleteDate)
            .ThenBy(x => x.Id).ToList();
    }

    private async Task<List<MediaEntry>> GetEntriesByStatusAsync(int userId, MediaEntryStatus status, int page = 1)
    {
        var results = new List<MediaEntry>();
        var filter = new MediaEntryFilter
        {
            Status = status,
            Sort = MediaEntrySort.StartedDate, SortDescending = false
        };

        var done = false;
        while (!done)
        {
            var pagination = new AniPaginationOptions(page, 50);
            var entries = await GetEntriesPageAsync(userId, filter, pagination);

            results.AddRange(entries.Data);

            if (entries.HasNextPage) page++;
            else done = true;
        }

        return results;
    }

    private Task<AniPagination<MediaEntry>> GetEntriesPageAsync
    (
        int userId, MediaEntryFilter filter, AniPaginationOptions options
    )
    {
        var parameters = _client.GetUserIdParams(userId).Concat(filter.ToParameters());
        return _client.GetPaginatedAsync<MediaEntry>(parameters, "mediaList", options);
    }

    private static readonly MediaEntryStatus[] Statuses =
    {
        MediaEntryStatus.Current,
        MediaEntryStatus.Completed,
        MediaEntryStatus.Dropped,
        MediaEntryStatus.Paused,
        MediaEntryStatus.Repeating
    };


    #region POST-PROCESSING

    private static void GroupBySeries(List<MediaEntry> entries)
    {
        foreach (var entry in entries) entry.Media.PopulateRelated();

        var relations = entries.ToDictionary(x => x.Media.Id, x => x.Media.GetRelations());

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

        SetSeriesId(entries, relations.Values);
    }

    private static void SetSeriesId(List<MediaEntry> entries, IEnumerable<HashSet<int>> sets)
    {
        var media = entries.ToDictionary(x => x.Media.Id, x => x.Media);

        foreach (var set in sets.Where(set => set.Count > 0))
        {
            var series = set.Min();
            foreach (var id in set.Where(id => media.ContainsKey(id)))
            {
                media[id].SeriesId = series;
            }
        }
    }

    private static void MinimizeData(List<MediaEntry> list)
    {
        foreach (var entry in list)
        {
            if (Date.IsNull(entry.StartDate))
                entry.StartDate = null;

            if (Date.IsNull(entry.CompleteDate))
                entry.CompleteDate = null;

            if (Date.IsNull(entry.Media.EndDate))
                entry.Media.EndDate = null;

            entry.Media.Cover.FixUrls();
        }
    }

    #endregion
}