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
    
    [Route("user/{username}")]
    public IActionResult Index(string username)
    {
        var timer = new Stopwatch();
        timer.Start();
        
        var baka = new AniListExtractor();
        var user = baka.GetUserViewModel(username);

        timer.Stop();
        _logger.LogInformation("User: {name}. Entries: {count}. Time elapsed: {time:m\\:ss\\.fff}", user.User.name, user.History.Count, timer.Elapsed);
        
        return View(user);
    }
}