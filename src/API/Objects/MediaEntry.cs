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

    public void SetTooltip(int min, int max, int today)
    {
        if (IsOutsideTimeline()) return;

        var start =    StartDate!.ToDateTime()!.Value;
        var end   = CompleteDate?.ToDateTime();

        var dayA = Helpers.DateTimeToUnixDays(start);
        var dayB = Helpers.DateTimeToUnixDays(end ?? Helpers.UnixDaysToDateTime(today));

        if (dayB > min && dayA < max)
        {
            var progressMatters = Media.Episodes is null or > 1 && Progress > 0;

            TimelineItem = new TimelineItem
            {
                Offset = Math.Max(dayA - min, 0),
                Length = Math.Min(dayB, max) - Math.Max(dayA, min) + 1,
                Tip = new TimelineItem.ToolTip
                {
                    DateRange = dayA == dayB
                        ? Helpers.DateToStringShort(start)
                        : Helpers.GetDateRange(start, end, Helpers.DateToStringShort),
                    Episodes = progressMatters ? Progress : null
                }
            };

            if (progressMatters)
            {
                var days = (double)TimelineItem.Length;
                if (days > 1)
                {
                    TimelineItem.Tip.AverageSpeed = CalculateReadingWatchingSpeed(days);
                    TimelineItem.Stripes = days / Progress > 30;
                }
            }
        }
        else
            TimelineItem = null;
    }

    private string CalculateReadingWatchingSpeed(double days)
    {
        var unit = Media.Type == MediaType.Anime ? "episode" : "chapter";

        var speed = Progress / days;
        var slow = speed < 1;

        var value = slow ? 1 / speed : speed;
        var x = Math.Round(value, 1);
        var one = Math.Abs(x - 1) < 0.1;

        return slow
            ? $"{unit} every {(one ? "day" : $"{x} days")}"
            : $"{x} {unit}{(one ? "" : "s")}/day";
    }
}