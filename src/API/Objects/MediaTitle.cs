using AniListNet.Helpers;

namespace API.Objects;

#pragma warning disable CS8618

public class MediaTitle
{
    [GqlSelection("romaji" )] public string  Romaji  { get; private set; }
    [GqlSelection("english")] public string? English { get; private set; }
    [GqlSelection("native" )] public string  Native  { get; private set; }
}