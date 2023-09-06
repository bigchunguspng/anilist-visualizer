using System.Diagnostics;
using AniListVisualizer.Services;
using Microsoft.AspNetCore.Mvc;

namespace AniListVisualizer.Controllers;

public class SearchController : Controller
{
    private readonly ILogger<SearchController> _logger;

    public SearchController(ILogger<SearchController> logger)
    {
        _logger = logger;
    }
    
    [Route("search/{search}")]
    public IActionResult Index(string search)
    {
        var timer = new Stopwatch();
        timer.Start();
        
        var baka = new AniListUserFinder();
        var list = baka.FindUsers(search);
        
        timer.Stop();
        _logger.LogInformation("Users found: {count}. Search string: {search}. Time elapsed: {time:m\\:ss\\.fff}", list.Count, search, timer.Elapsed);
        
        return View(list);
    }
}