using AniListVisualizer.Models;
using AniListVisualizer.Services;

namespace AniListVisualizer;

internal static class Program
{
    public static void Main(string[] args)
    {
        var baka = new AniListExtractor();
        var user = "oncewascrunchy"; // not me
        Console.WriteLine(baka.GetAniListUserID(user));
        var list = baka.GetFullMediaList(user);
        Console.WriteLine(list.Count);
        foreach (var entry in list.Where(x => x.status is EntryStatus.COMPLETED or EntryStatus.CURRENT or EntryStatus.PAUSED).OrderBy(x => x.watching_start.year).ThenBy(x => x.watching_start.month).ThenBy(x => x.watching_start.day))
        {
            Console.WriteLine(entry.media.title["romaji"]);
        }
        /*var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddControllersWithViews();

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (!app.Environment.IsDevelopment())
        {
            app.UseExceptionHandler("/Home/Error");
            // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
            app.UseHsts();
        }

        app.UseHttpsRedirection();
        app.UseStaticFiles();

        app.UseRouting();

        app.UseAuthorization();

        app.MapControllerRoute(
            name: "default",
            pattern: "{controller=Home}/{action=Index}/{id?}");

        app.Run();*/
    }
}