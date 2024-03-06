using AniListNet.Helpers;

namespace API.Objects;

#pragma warning disable CS8618
public class Image
{
    [GqlSelection("large" )] public Uri Large  { get; private set; }
    [GqlSelection("medium")] public Uri Medium { get; private set; }
}