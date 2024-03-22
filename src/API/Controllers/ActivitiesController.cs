using API.Objects;
using API.Services;
using API.Services.Cache;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController, Route("api/[controller]")]
public class ActivitiesController : ControllerWithLogger
{
    private readonly ActivitiesService _service;
    private readonly Cache<User> _userCache;
    private readonly Cache<Cache<TitleActivities>> _activityCache;

    public ActivitiesController
    (
        ILogger<ActivitiesController> logger,
        ActivitiesService service,
        Cache<User> userCache,
        Cache<Cache<TitleActivities>> activityCache
    ) : base(logger)
    {
        _service = service;
        _userCache = userCache;
        _activityCache = activityCache;
    }

    [HttpGet("{userId:int}/{mediaId:int}"), ResponseCache(Duration = 30)]
    public async Task<ActionResult<TitleActivities>> Get(int userId, int mediaId)
    {
        try
        {
            var cache = TryGetFromCache(userId, mediaId);
            if (cache != null)
            {
                LogActivities(userId, mediaId, cache.Activities.Count);
                return Ok(cache);
            }

            var activities = new TitleActivities(await _service.GetActivities(userId, mediaId));
            UpdateCache(userId, mediaId, activities);

            LogActivities(userId, mediaId, activities.Activities.Count);
            return Ok(activities);
        }
        catch (Exception e)
        {
            LogException(e);
            return NotFound();
        }
    }

    private TitleActivities? TryGetFromCache(int userId, int mediaId)
    {
        var user = _userCache.GetNodeOrNull(userId);

        if (_activityCache.GetNodeOrNull(userId) is { } medias && medias.Data.GetNodeOrNull(mediaId) is { } activities)
        {
            if (user is not null)
            {
                if (user.IsNotYoungerThan(activities))
                {
                    return activities.Data;
                }
            }
            else if (activities.UpdatedAt > Helpers.GetDateTimeMinutesAgo(15))
            {
                return activities.Data;
            }
        }

        return null;
    }

    private void UpdateCache(int userId, int mediaId, TitleActivities activities)
    {
        var mediaCache = _activityCache.GetNodeOrNull(userId)?.Data ?? new Cache<TitleActivities>();
        mediaCache.Update(mediaId, activities, DateTime.Now.ToUnixTimeStamp());
        _activityCache.Update(userId, mediaCache, DateTime.Now.ToUnixTimeStamp());
    }

    private void LogActivities(int userId, int mediaId, int count)
    {
        Logger.LogInformation("USER: [{userId}] MEDIA: [{mediaId}] ACTIVITIES: {count}", userId, mediaId, count);
    }
}