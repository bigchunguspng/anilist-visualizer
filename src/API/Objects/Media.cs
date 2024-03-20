using AniListNet.Helpers;
using AniListNet.Objects;
using API.Services;

#pragma warning disable CS0649
#pragma warning disable CS8618

namespace API.Objects;

public class Media
{
    [GqlSelection("id"   )] public int        Id    { get; private set; }
    [GqlSelection("type" )] public MediaType  Type  { get; private set; }
    [GqlSelection("title")] public MediaTitle Title { get; private set; }

    [GqlSelection("coverImage")] public MediaCover Cover { get; private set; }
    [GqlSelection("siteUrl"   )] public Uri        Url   { get; private set; }

    [GqlSelection("status")] [GqlParameter("version", 2)] public MediaStatus? Status { get; private set; }
    [GqlSelection("source")] [GqlParameter("version", 3)] public MediaSource? Source { get; private set; }

    public int? Episodes => _episodes ?? _chapters;

    [GqlSelection("episodes")] private int? _episodes;
    [GqlSelection("chapters")] private int? _chapters;

    public int? SeriesId { get; set; }

    public AiringTimelineItem? TimelineItem { get; set; }

    [GqlSelection("season"    )] private MediaSeason? Season { get; set; }
    [GqlSelection("seasonYear")] private int?           Year { get; set; }
    [GqlSelection( "startDate")] private Date      StartDate { get; set; }
    [GqlSelection(   "endDate")] private Date?       EndDate { get; set; }

    [GqlSelection("relations")] private MediaConnection _relations;

    public HashSet<int> GetRelations()
    {
        var relations = _relations.Egdes
            .Where(x => x.Type != MediaRelation.Character)
            .Select(x => x.Media.Id)
            .ToHashSet();
        relations.Add(Id);
        return relations;
    }

    public void SetAiringTooltip(int min, int max, int today)
    {
        var start = StartDate .ToDateTime() ?? Helpers.UnixDaysToDateTime(min);
        var end   =   EndDate?.ToDateTime();

        var dayA = start.ToUnixDays();
        var dayB = end ?.ToUnixDays() ?? today;

        if (dayB > min && dayA < max)
        {
            TimelineItem = new AiringTimelineItem
            {
                Offset = Math.Max(dayA - min, 0),
                Length = Math.Min(dayB, max) - Math.Max(dayA, min) + 1
            };

            TimelineItem.Season = TimelineItem.Length == 1
                ? Helpers.DateToStringFull(start)
                : Season is not null && TimelineItem.Length > 30
                    ? $"{Season.ToString()!.ToUpper()} {Year}"
                    : Helpers.GetDateRange(start, end, GetDateTimeFormat(), '→');
        }
        else
            TimelineItem = null;
    }

    private Func<DateTime, string> GetDateTimeFormat()
    {
        return Season is null ? Helpers.DateToStringLong : Helpers.DateToStringShort;
    }
}