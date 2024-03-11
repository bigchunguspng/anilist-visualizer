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

    public TimelineItem? TimelineItem { get; set; }

    public bool IsOutsideTimeline() => Date.IsNull(StartDate);

    /// <summary>
    /// Swaps <see cref="StartDate"/> and <see cref="CompleteDate"/> if they are in the wrong order.
    /// </summary>
    public void FixDates()
    {
        var wrongOrder = StartDate is { } start && CompleteDate is { } end && end < start;
        if (wrongOrder) (StartDate, CompleteDate) = (CompleteDate, StartDate);
    }

    public void SetTooltip(int min)
    {
        if (IsOutsideTimeline()) return;

        TimelineItem = new TimelineItem();

        var start =    StartDate!.ToDateTime()!.Value;
        var end   = CompleteDate?.ToDateTime();

        var dayA = Helpers.DateTimeToUnixDays(start);
        var dayB = Helpers.DateTimeToUnixDays(end ?? DateTime.Today);

        TimelineItem.Offset = dayA - min;
        TimelineItem.Length = dayB - dayA + 1;

        var progressMatters = Media.Episodes is null or > 1 && Progress > 0;

        TimelineItem.Tip = new TimelineItem.ToolTip
        {
            DateRange = dayA == dayB
                ? Helpers.DateToStringShort(start)
                : Helpers.GetDateRange(start, end, Helpers.DateToStringShort),
            Episodes = progressMatters ? Progress : null
        };

        if (progressMatters) // calculate average watching / reading speed
        {
            var days = (double)TimelineItem.Length;
            if (days > 1)
            {
                var unit = Media.Type == MediaType.Anime ? "episode" : "chapter";

                var dailyProgress = Progress / days;
                var slow = dailyProgress < 1;

                var value = slow ? 1 / dailyProgress : dailyProgress;
                var x = Math.Round(value, 1);
                var one = Math.Abs(x - 1) < 0.1;

                TimelineItem.Tip.AverageSpeed = slow
                    ? $"{unit} every {(one ? "day" : $"{x} days")}"
                    : $"{x} {unit}{(one ? "" : "s")}/day";

                TimelineItem.Stripes = days / Progress > 30;
            }
        }
    }
}