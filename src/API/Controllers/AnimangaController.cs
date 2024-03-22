using API.Objects;
using API.Services;
using API.Services.Cache;
using Microsoft.AspNetCore.Mvc;
using MediaEntry = API.Objects.MediaEntry;
using User = API.Objects.User;

namespace API.Controllers;

[ApiController, Route("api/[controller]")]
public class AnimangaController : ControllerWithLogger
{
    private readonly AnimangaService _service;
    private readonly Cache<User> _userCache;
    private readonly Cache<List<MediaEntry>> _entryCache;
    private readonly Cache<Cache<TitleActivities>> _activityCache;

    public AnimangaController
    (
        ILogger<AnimangaController> logger,
        AnimangaService service,
        Cache<User> userCache,
        Cache<List<MediaEntry>> entryCache,
        Cache<Cache<TitleActivities>> activityCache
    ) : base(logger)
    {
        _service = service;
        _userCache = userCache;
        _entryCache = entryCache;
        _activityCache = activityCache;
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

            var activities = _activityCache.GetNodeOrNull(userId)?.Data;

            if (listCache != null)
            {
                if (userCache != null)
                {
                    if (userCache.IsNotYoungerThan(listCache))
                    {
                        return new Animanga(listCache.Data, activities, from, to);
                    }
                }
                else if (listCache.UpdatedAt > Helpers.GetDateTimeMinutesAgo(15))
                {
                    return new Animanga(listCache.Data, activities, from, to);
                }
            }

            var entries = await _service.GetEntriesAsync(userId);

            var updatedAt = userCache?.UpdatedAt ?? DateTime.Now.ToUnixTimeStamp();
            _entryCache.Update(userId, entries, updatedAt);

            LogEntries(userId, entries.Count);
            return Ok(new Animanga(entries, activities, from, to));
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
}