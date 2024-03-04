using AniListNet.Helpers;
using AniListNet.Objects;

#pragma warning disable CS8618

namespace API.Objects;

public class MediaEntry
{
    [GqlSelection("id"         )] public int Id                  { get; private set; }
    [GqlSelection("progress"   )] public int Progress            { get; private set; }
    [GqlSelection("repeat"     )] public int Repeats             { get; private set; }
    [GqlSelection("status"     )] public MediaEntryStatus Status { get; private set; }
    [GqlSelection("startedAt"  )] public Date? StartDate         { get; private set; }
    [GqlSelection("completedAt")] public Date? CompleteDate      { get; private set; }
 // [GqlSelection("score"      )] public float Score             { get; private set; }
    [GqlSelection("media"      )] public Media Media             { get; private set; }

    public bool ProgressMatters => Media.Divisions > 1 && Progress > 0;
}