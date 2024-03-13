using API.Services;

namespace API.Objects;

public class Animanga
{
    public int MinDay { get; private set; } // min & max days of the current timeframe
    public int MaxDay { get; private set; }
    public int Today  { get; private set; } // (days since 1 Jan 1970)

    public int[]                Years            { get; private set; } // all years
    public Dictionary<int, int> TimelineSections { get; private set; } // durations in days

    public int SeriesShown { get; private set; }
    public int SeriesTotal { get; private set; }

    public List<MediaEntry> Entries { get; private set; }


    public Animanga(List<MediaEntry> entries, int? from = null, int? to = null)
    {
        var subframe = from is not null && to is not null;

        Entries = entries;

        var showable = entries.Where(x => !x.IsOutsideTimeline()).ToList();

        var allMin = showable.Min(x => x.StartDate!.ToDateTime()!.Value);
        var allMax = DateTime.Today;

        var min = subframe ? new DateTime(from!.Value, 1, 1) : allMin;
        var max = subframe ? new DateTime(to!.Value, 12, 31) : allMax;

        var visible = subframe
            ? showable
                .Where(x => x.StartDate!.Year <= to && (x.CompleteDate?.Year ?? DateTime.Today.Year) >= from)
                .ToList()
            : showable;

        var empty = visible.Count == 0;

        SeriesShown = empty ? 0 : visible.DistinctBy(x => x.Media.SeriesId).Count();
        SeriesTotal =             entries.DistinctBy(x => x.Media.SeriesId).Count();

        MinDay = min.ToUnixDays();
        MaxDay = max.ToUnixDays();
        Today  = DateTime.Today.ToUnixDays();

        Years = YearsRange(allMin.Year, allMax.Year).ToArray();
        TimelineSections = YearsRange(min.Year, max.Year).ToDictionary(x => x, DaysInYear); // todo months if year.len == 1

        IEnumerable<int> YearsRange(int a, int b) => Enumerable.Range(a, b - a + 1);

        int DaysInYear(int year)
        {
            return year == min.Year
                ? (int)(new DateTime(year, 12, 31) - min).TotalDays + 1
                : year == max.Year
                    ? (int)(max - new DateTime(year, 1, 1)).TotalDays + 1
                    : DateTime.IsLeapYear(year) ? 366 : 365;
        }

        foreach (var entry in showable)
        {
            entry.FixDates();
            entry.SetTooltip(MinDay, MaxDay, Today);
            entry.Media.SetAiringTooltip(MinDay, MaxDay, Today);
        }
    }
}