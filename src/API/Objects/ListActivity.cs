using AniListNet.Helpers;

namespace API.Objects;

public class ListActivity
{
    [GqlSelection("id")] public int Id { get; set; }

    [GqlSelection("status"  )] public string? Status   { get; set; }
    [GqlSelection("progress")] public string? Progress { get; set; }

    [GqlSelection("createdAt")] public int CreatedAt { get; set; }
}