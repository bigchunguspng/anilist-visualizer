using System.Diagnostics;
using AniListNet.Helpers;
using AniListNet.Objects;

#pragma warning disable CS8618

namespace API.Objects;

[DebuggerDisplay("{Media.Title.English}")]
public class MediaEntry
{
    [GqlSelection("id"         )] public int Id                  { get; private set; }
    [GqlSelection("progress"   )] public int Progress            { get; private set; }
    [GqlSelection("repeat"     )] public int Repeats             { get; private set; }
    [GqlSelection("status"     )] public MediaEntryStatus Status { get; private set; }
    [GqlSelection("startedAt"  )] public Date? StartDate         { get; set; }
    [GqlSelection("completedAt")] public Date? CompleteDate      { get; set; }
    [GqlSelection("media"      )] public Media Media             { get; private set; }

    public bool ProgressMatters => Media.Episodes is null or > 1;

    public void FixDates()
    {
        if (StartDate != null && CompleteDate != null && CompleteDate < StartDate)
        {
            (StartDate, CompleteDate) = (CompleteDate, StartDate);
        }
    }
}