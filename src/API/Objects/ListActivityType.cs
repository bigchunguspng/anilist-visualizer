using AniListNet.Helpers;

namespace API.Objects;

public class ListActivityType
{
    [GqlSelection("__typename ... on ListActivity")] public ListActivity[]? Activity { get; set; }
}