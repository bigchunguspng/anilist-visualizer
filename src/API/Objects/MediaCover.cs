using AniListNet.Helpers;

namespace API.Objects;

#pragma warning disable CS8618

public class MediaCover
{
    [GqlSelection("color" )] public string? Color  { get; private set; }
    [GqlSelection("large" )] public string  Large  { get; private set; }
    [GqlSelection("medium")] public string  Medium { get; private set; }

    public void FixUrls()
    {
        Large  = Large [BaseUrl.Length..];
        Medium = Medium[BaseUrl.Length..];
    }

    private const string BaseUrl = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/";
}