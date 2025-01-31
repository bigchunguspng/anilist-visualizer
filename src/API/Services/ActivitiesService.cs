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

    public Task<List<ListActivity>> 
        GetActivitiesByMedia(int userId, int mediaId, int page = 1)
    {
        var filter = new ActivityFilter
        {
            Type = ActivityType.MediaList,
            UserId = userId,
            MediaId = mediaId,
        };
        return GetActivitiesInternal<ListActivity, ListActivity.Type>(filter, page);
    }

    public Task<List<ListActivityWithMedia>>
        GetActivitiesByRange(int userId, DateTime min, DateTime max, int page = 1)
    {
        var filter = new ActivityFilter
        {
            Type = ActivityType.MediaList,
            UserId = userId,
            CreatedAtMin = min.ToUnixTimeStamp(),
            CreatedAtMax = max.ToUnixTimeStamp(),
        };
        return GetActivitiesInternal<ListActivityWithMedia, ListActivityWithMedia.Type>(filter, page);
    }

    private async Task<List<T>> GetActivitiesInternal<T, TType>(ActivityFilter filter, int page)
    {
        var results = new List<T>();

        var done = false;
        while (!done)
        {
            var pagination = new AniPaginationOptions(page, 50);
            var entries = await GetEntriesPageAsync<T, TType>(filter, pagination);

            results.AddRange(entries.Data);

            if (entries.HasNextPage) page++;
            else done = true;
        }

        return results;
    }

    private Task<AniPagination<T>> GetEntriesPageAsync<T, TType>(ActivityFilter filter, AniPaginationOptions options)
    {
        return _client.GetPaginatedAsync<TType, T>(filter.ToParameters(), "activities", options);
    }
}