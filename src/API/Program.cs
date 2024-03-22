using System.Globalization;
using AniListNet;
using API.Middleware;
using API.Objects;
using API.Services;
using API.Services.Cache;
using User = API.Objects.User;

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

        builder.Services.AddSingleton<Cache<User>>();
        builder.Services.AddSingleton<Cache<List<MediaEntry>>>();
        builder.Services.AddSingleton<Cache<Cache<TitleActivities>>>();

        builder.Services.AddScoped<AniClient>();
        builder.Services.AddScoped<AnimangaService>();
        builder.Services.AddScoped<ActivitiesService>();
        builder.Services.AddScoped<StopwatchMiddleware>();

        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        var app = builder.Build();

        // Configure the HTTP request pipeline.

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI(options => options.EnableTryItOutByDefault());
        }

        app.UseCors(x => x.AllowAnyHeader().AllowAnyMethod().WithOrigins("http://localhost:3000"));

        app.UseAuthorization();

        app.MapControllers();

        app.UseMiddleware(typeof(StopwatchMiddleware));

        app.Run();
    }
}