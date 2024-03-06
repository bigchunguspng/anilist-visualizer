using AniListNet.Helpers;
using Humanizer;

#pragma warning disable CS8618

namespace API.Objects;

public class User
{
    [GqlSelection("id"       )] public int     Id        { get; private set; }
    [GqlSelection("name"     )] public string  Name      { get; private set; }
    [GqlSelection("avatar"   )] public Image   Avatar    { get; private set; }
    [GqlSelection("updatedAt")] public int     UpdatedAt { get; private set; }

    public Uri Url => new($"https://anilist.co/user/{Name}/");

    public string LastActivity => DateTimeOffset.FromUnixTimeSeconds(UpdatedAt).Humanize();
}