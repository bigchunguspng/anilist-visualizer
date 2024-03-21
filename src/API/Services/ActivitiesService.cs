using AniListNet;
using API.Objects;
using API.Objects.Filters;

namespace API.Services;

public class ActivitiesService
{
    private readonly AniClient _client;

    public ActivitiesService(AniClient client)
    {
        _client = client;
    }

    public async Task<List<ListActivity>> GetActivities(int userId, int mediaId, int page = 1)
    {
        var results = new List<ListActivity>();
        var filter = new ActivityFilter
        {
            UserId = userId,
            MediaId = mediaId,
            Type = ActivityType.MediaList
        };

        var done = false;
        while (!done)
        {
            var pagination = new AniPaginationOptions(page, 50);
            var entries = await GetEntriesPageAsync(filter, pagination);

            results.AddRange(entries.Data);

            if (entries.HasNextPage) page++;
            else done = true;
        }

        return results;
    }

    private Task<AniPagination<ListActivity>> GetEntriesPageAsync(ActivityFilter filter, AniPaginationOptions options)
    {
        return _client.GetPaginatedAsync<ListActivity.Type, ListActivity>(filter.ToParameters(), "activities", options);
    }
}