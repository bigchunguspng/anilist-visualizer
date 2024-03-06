using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class ControllerWithLogger : ControllerBase
{
    protected readonly ILogger<ControllerWithLogger> Logger;
    
    public ControllerWithLogger(ILogger<ControllerWithLogger> logger)
    {
        Logger = logger;
    }

    protected void LogException(Exception e)
    {
        Logger.LogError("EXCEPTION --> {exception}", e.Message);
    }
}