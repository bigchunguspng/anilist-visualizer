using AniListVisualizer.Services;
using Microsoft.AspNetCore.Mvc;

namespace AniListVisualizer.Controllers;

public class UserController : Controller
{
    [Route("user/{username}")]
    public IActionResult Index(string username)
    {
        var baka = new AniListExtractor();
        var list = baka.GetFullMediaList(username);
        
        ViewBag.Username = username;
        return View(list);
    }
}