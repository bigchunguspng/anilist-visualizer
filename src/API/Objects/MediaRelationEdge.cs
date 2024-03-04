using AniListNet.Helpers;
using AniListNet.Objects;

namespace API.Objects;

#pragma warning disable CS8618

public class MediaRelationEdge
{
    [GqlSelection("relationType"), GqlParameter("version", 2)]
    public MediaRelation Type { get; private set; }

    [GqlSelection("node")]
    public Node Media { get; private set; }
}