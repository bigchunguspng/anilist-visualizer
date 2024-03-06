using AniListNet.Helpers;

namespace API.Objects;

#pragma warning disable CS0649
#pragma warning disable CS8618

public class MediaTitle
{

    [GqlSelection("romaji" )] private string  _romaji;
    [GqlSelection("english")] private string? _english;
    [GqlSelection("native" )] private string  _native;

    public string English  => _english ?? _romaji;
    public string Japanese => _native;
}