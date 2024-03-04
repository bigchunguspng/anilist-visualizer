using AniListNet.Helpers;
using AniListNet.Objects;

namespace API.Objects;

#pragma warning disable CS8618

public class MediaCover
{
    [GqlSelection("color" )] public string? Color  { get; private set; }
    [GqlSelection("large" )] public Uri     Large  { get; private set; }
    [GqlSelection("medium")] public Uri     Medium { get; private set; }
}