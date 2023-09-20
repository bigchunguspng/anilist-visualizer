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
    public async Task<IActionResult> Index(string username)
    {
        try
        {
            var timer = new Stopwatch();
            timer.Start();
        
            var baka = new AniListExtractor();
            var user = await baka.GetUserViewModel(username);

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