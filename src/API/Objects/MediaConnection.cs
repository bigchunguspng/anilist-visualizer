using AniListNet.Helpers;

namespace API.Objects;

#pragma warning disable CS8618

public class MediaConnection
{
    [GqlSelection("edges")] public MediaRelationEdge[] Egdes { get; private set; }
}