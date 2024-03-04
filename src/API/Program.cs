using System.Globalization;
using AniListNet;
using API.Middleware;
using API.Models;
using API.Services;

namespace API;

internal class Program
{
    public static void Main(string[] args)
    {
        CultureInfo.DefaultThreadCurrentCulture   = CultureInfo.InvariantCulture;
        CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.InvariantCulture;
        
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddControllers();
        builder.Services.AddRouting(o => o.LowercaseUrls = true);

        builder.Services.AddSingleton<CacheService<UserViewModel>>();
        builder.Services.AddScoped<AniListExtractor>();
        builder.Services.AddScoped<AniClient>();
        builder.Services.AddScoped<StopwatchMiddleware>();

        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseAuthorization();

        app.MapControllers();

        app.UseMiddleware(typeof(StopwatchMiddleware));

        app.Run();
    }
}