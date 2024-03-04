using AniListNet.Helpers;

namespace API.Objects;

#pragma warning disable CS8618

public class Node
{
    [GqlSelection("id")] public int Id { get; private set; }
}