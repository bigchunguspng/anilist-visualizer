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
        _logger.LogInformation("SEARCH: {search}. RESULTS: {count}. TIME: {time:m\\:ss\\.fff}", search, list.Count, timer.Elapsed);
        
        return View(list);
    }
}