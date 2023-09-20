using System.Diagnostics;
using AniListVisualizer.Models;
using Microsoft.AspNetCore.Mvc;

namespace AniListVisualizer.Controllers;

[Route("error")]
public class ErrorController : Controller
{
    [Route("{statusCode:int}")]
    public IActionResult Index(int statusCode)
    {
        if (statusCode == 404)
        {
            return View("PageNotFound");
        }

        return View("Error");
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}