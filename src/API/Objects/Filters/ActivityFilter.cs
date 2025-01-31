using AniListNet.Helpers;
using AniListNet.Parameters;

namespace API.Objects.Filters;

public class ActivityFilter : AbstractFilter
{
    public int?  UserId { get; set; }
    public int? MediaId { get; set; }
    public int? CreatedAtMin { get; set; } // exclusive bounds
    public int? CreatedAtMax { get; set; }

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
        if (CreatedAtMin.HasValue)
            parameters.Add(new GqlParameter("createdAt_greater", CreatedAtMin));
        if (CreatedAtMax.HasValue)
            parameters.Add(new GqlParameter("createdAt_lesser",  CreatedAtMax));
        return parameters;
    }
}