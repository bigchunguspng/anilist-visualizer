using AniListNet.Helpers;
using AniListNet.Objects;

namespace API.Objects;

#pragma warning disable CS8618

public class MediaCover : Image
{
    [GqlSelection("color")] public string? Color { get; private set; }
}