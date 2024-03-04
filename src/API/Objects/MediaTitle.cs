using AniListNet.Helpers;

namespace API.Objects;

#pragma warning disable CS8618

public class MediaTitle
{
    [GqlSelection("romaji" )] public string  RomajiTitle  { get; private set; }
    [GqlSelection("english")] public string? EnglishTitle { get; private set; }
    [GqlSelection("native" )] public string  NativeTitle  { get; private set; }
}