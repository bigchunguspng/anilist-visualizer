using AniListNet;
using AniListNet.Objects;
using AniListNet.Parameters;
using Date = API.Objects.Date;
using MediaEntry = API.Objects.MediaEntry;

namespace API.Services;

public class AnimangaService
{
    private static readonly MediaEntryStatus[] Statuses =
    {
        MediaEntryStatus.Current,
        MediaEntryStatus.Completed,
        MediaEntryStatus.Dropped,
        MediaEntryStatus.Paused,
        MediaEntryStatus.Repeating
    };

    private readonly AniClient _client;

    public AnimangaService(AniClient client)
    {
        _client = client;
    }


    public async Task<List<MediaEntry>> GetEntriesAsync(int userId)
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


    #region FETCHING DATA

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

    private Task<AniPagination<MediaEntry>> GetEntriesPageAsync(int userId, MediaEntryFilter filter, AniPaginationOptions options)
    {
        var parameters = _client.GetUserIdParams(userId).Concat(filter.ToParameters());
        return _client.GetPaginatedAsync<MediaEntry>(parameters, "mediaList", options);
    }

    #endregion


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