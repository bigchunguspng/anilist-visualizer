using AniListNet.Helpers;
using API.Services;

namespace API.Objects;

public class ListActivity
{
    [GqlSelection("progress")] public string? Episodes { get; set; }

    [GqlSelection("status")] private string? _status;

    [GqlSelection("createdAt")] private int _createdAt;

    public int Day => Helpers.SecondsToDays(_createdAt);

    public int Progress => Episodes is null
        ? _status == "completed"
            ? 1
            : 0
        : Episodes.Contains(' ')
            ? ParseComplexProgress()
            : 1;

    private int ParseComplexProgress()
    {
        try
        {
            var split = Episodes!.Split(" - ");
            var a = int.Parse(split[0]);
            var b = int.Parse(split[1]);

            return b - a + 1;
        }
        catch
        {
            return 2;
        }
    }

    public class Type
    {
        [GqlSelection("__typename ... on ListActivity")] public ListActivity[]? Activity { get; set; }
    }
}