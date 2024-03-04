using AniListNet.Helpers;
using AniListNet.Objects;

#pragma warning disable CS0649
#pragma warning disable CS8618

namespace API.Objects;

public class Media
{
    [GqlSelection("id"   )] public int        Id    { get; private set; }
    [GqlSelection("title")] public MediaTitle Title { get; private set; }
    [GqlSelection("type" )] public MediaType  Type  { get; private set; }

    [GqlSelection("status")] [GqlParameter("version", 2)] public MediaStatus? Status { get; private set; }
    [GqlSelection("source")] [GqlParameter("version", 3)] public MediaSource? Source { get; private set; }

    public int? Episodes => _episodes ?? _chapters;

    [GqlSelection("episodes")] private int? _episodes;
    [GqlSelection("chapters")] private int? _chapters;
    [GqlSelection("duration")] public  int? Duration { get; private set; } // in minutes

    [GqlSelection("season"    )] public MediaSeason? Season { get; private set; }
    [GqlSelection("seasonYear")] public int?           Year { get; private set; }

    [GqlSelection("startDate")] public Date StartDate { get; private set; }
    [GqlSelection(  "endDate")] public Date   EndDate { get; private set; }
    [GqlSelection("updatedAt")] public int  UpdatedAt { get; private set; }

    [GqlSelection("coverImage")] public MediaCover Cover { get; private set; }
    [GqlSelection("siteUrl"   )] public Uri        Url   { get; private set; }

    [GqlSelection("relations")] private MediaConnection Relations { get; set; }

    public int? SeriesId { get; set; }

    public  HashSet<int> GetRelations() => Related;
    private HashSet<int> Related { get; set; } = default!;

    public void PopulateRelated()
    {
        Related = Relations.Egdes.Where(x => x.Type != MediaRelation.Character).Select(x => x.Media.Id).ToHashSet();
        Related.Add(Id);
    }
}