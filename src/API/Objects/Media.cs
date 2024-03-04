using AniListNet.Helpers;
using AniListNet.Objects;

#pragma warning disable CS8618

namespace API.Objects;

public class Media
{
    [GqlSelection("id"   )] public int        Id    { get; private set; }
    [GqlSelection("title")] public MediaTitle Title { get; private set; }
    [GqlSelection("type" )] public MediaType  Type  { get; private set; }

    [GqlSelection("status")] [GqlParameter("version", 2)] public MediaStatus? Status { get; private set; }
    [GqlSelection("source")] [GqlParameter("version", 3)] public MediaSource? Source { get; private set; }

    public int? Divisions => Episodes ?? Chapters;

    [GqlSelection("episodes")] private int? Episodes { get; set; }
    [GqlSelection("chapters")] private int? Chapters { get; set; }
    [GqlSelection("duration")] public  int? Duration { get; private set; } // minutes

    [GqlSelection("season"    )] public MediaSeason? Season { get; private set; }
    [GqlSelection("seasonYear")] public int?           Year { get; private set; }

    [GqlSelection("startDate")] public Date StartDate { get; private set; }
    [GqlSelection("endDate"  )] public Date   EndDate { get; private set; }
    [GqlSelection("updatedAt")] public int  UpdatedAt { get; private set; }

    [GqlSelection("coverImage")] public MediaCover Cover    { get; private set; }
    [GqlSelection("siteUrl"   )] public Uri        Url      { get; private set; }

    [GqlSelection("relations")] public MediaConnection Relations { get; private set; }
}