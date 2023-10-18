using System.Diagnostics;
using AniListVisualizer.Services;
using Microsoft.AspNetCore.Mvc;

namespace AniListVisualizer.Controllers;

public class UserController : Controller
{
    private readonly ILogger<UserController> _logger;

    public UserController(ILogger<UserController> logger)
    {
        _logger = logger;
    }
    
    [Route("user/{username}/{from?}/{to?}")]
    public async Task<IActionResult> Index(string username, int? from, int? to)
    {
        try
        {
            var timer = new Stopwatch();
            timer.Start();
        
            var baka = new AniListExtractor();
            var user = await baka.GetUserViewModel(username);

            if (from is not null)
            {
                var same = to is null;

                var min = same ? from.Value : Math.Min(from.Value, to!.Value);
                var max = same ? from.Value : Math.Max(from.Value, to!.Value);

                user.Years = same ? new HashSet<int> { min } : Enumerable.Range(min, max - min + 1).ToHashSet();
            }

            timer.Stop();
            _logger.LogInformation("USER: {name}. ENTRIES: {count}. TIME: {time:m\\:ss\\.fff}", user.User.name, user.History.Count, timer.Elapsed);
        
            return View(user);
        }
        catch (Exception)
        {
            Response.StatusCode = 404;
            return View("../Error/PageNotFound");
        }
    }
}