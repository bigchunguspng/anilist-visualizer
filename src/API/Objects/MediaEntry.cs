using System.Diagnostics;
using AniListNet.Helpers;
using AniListNet.Objects;
using API.Services;

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

    public bool OutsideTimeline => Date.IsNull(StartDate);

    public TimelineItem? TimelineItem { get; set; }

    public void FixDates()
    {
        var wrongOrder = StartDate is { } start && CompleteDate is { } end && end < start;
        if (wrongOrder) (StartDate, CompleteDate) = (CompleteDate, StartDate);
        else CompleteDate ??= new Date(DateTime.Today);
    }

    public void SetTooltip(DateTime min)
    {
        if (OutsideTimeline) return;

        TimelineItem = new TimelineItem();

        var start =    StartDate!.ToDateTime()!.Value;
        var end   = CompleteDate!.ToDateTime()!.Value;

        TimelineItem.Offset = (int)(start - min).TotalDays;
        TimelineItem.Length = (int)(end - start).TotalDays + 1;

        var tip = new TimelineItem.ToolTip
        {
            DateRange = start == end
                ? Helpers.DateToStringShort(start)
                : Helpers.GetDateRange(start, end, Helpers.DateToStringShort),
            Episodes = ProgressMatters ? Progress : null
        };

        if (ProgressMatters) // calculate average watching / reading speed
        {
            var days = (end - start).TotalDays + 1;
            if (days > 1)
            {
                var unit = Media.Type == MediaType.Anime ? "episode" : "chapter";

                var dailyProgress = Progress / days;
                var slow = dailyProgress < 1;

                var value = slow ? 1 / dailyProgress : dailyProgress;
                var x = Math.Round(value, 1);
                var one = Math.Abs(x - 1) < 0.1;

                tip.AverageSpeed = slow 
                    ? $"{unit} every {(one ? "day" : $"{x} days")}" 
                    : $"{x} {unit}{(one ? "" : "s")}/day";

                TimelineItem.Stripes = days / Progress > 30;
            }
        }

        TimelineItem.Tip = tip;
    }
}