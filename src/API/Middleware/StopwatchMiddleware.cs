using System.Diagnostics;

namespace API.Middleware;

public class StopwatchMiddleware : IMiddleware
{
    private readonly Stopwatch _timer;
    private readonly ILogger<Stopwatch> _logger;

    public StopwatchMiddleware(ILogger<Stopwatch> logger)
    {
        _timer = new Stopwatch();
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        _timer.Start();

        await next.Invoke(context);

        _timer.Stop();
        _logger.LogInformation(@"TIME: {time:mm\:ss\.fff}", _timer.Elapsed);
    }
}