using System.Diagnostics;
using AniListVisualizer.Services;
using Microsoft.AspNetCore.Mvc;

namespace AniListVisualizer.Controllers;

public class UserController : Controller
{
    private readonly ILogger<UserController> _logger;
    private readonly AniListExtractor _baka;

    public UserController(ILogger<UserController> logger, AniListExtractor extractor)
    {
        _logger = logger;
        _baka = extractor;
    }
    
    [Route("user/{username}")]
    public async Task<IActionResult> Index(string username)
    {
        try
        {
            var timer = new Stopwatch();
            timer.Start();

            var user = await _baka.GetUserViewModel(username);

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