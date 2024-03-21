using AniListNet.Helpers;
using AniListNet.Parameters;

namespace API.Objects.Filters;

public class ActivityFilter : AbstractFilter
{
    public int?  UserId { get; set; }
    public int? MediaId { get; set; }

    public ActivityType? Type { get; set; }

    public override IList<GqlParameter> ToParameters()
    {
        var parameters = new List<GqlParameter>();
        if (UserId.HasValue)
            parameters.Add(new GqlParameter("userId", UserId));
        if (MediaId.HasValue)
            parameters.Add(new GqlParameter("mediaId", MediaId));
        if (Type.HasValue)
            parameters.Add(new GqlParameter("type", Type));
        return parameters;
    }
}