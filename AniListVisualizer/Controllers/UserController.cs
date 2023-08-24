using AniListVisualizer.Services;
using Microsoft.AspNetCore.Mvc;

namespace AniListVisualizer.Controllers;

public class UserController : Controller
{
    [Route("user/{username}")]
    public IActionResult Index(string username)
    {
        var baka = new AniListExtractor();
        var user = baka.GetUserViewModel(username);

        return View(user);
    }
}