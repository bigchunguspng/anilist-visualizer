using API.Services;

namespace API.Objects;

public class Animanga
{
    public int MinDay { get; private set; }
    public int MaxDay { get; private set; }
    public int Today  { get; private set; } // (days since 1 Jan 1970)

    public Dictionary<int, int> Years { get; private set; } // year durations in days

    public int SeriesShown { get; private set; }
    public int SeriesTotal { get; private set; }

    public List<MediaEntry> Entries { get; private set; }


    public Animanga(List<MediaEntry> entries, DateOnly? from = null, DateOnly? to = null)
    {
        Entries = entries;

        var tracked = entries.Where(x => !x.IsOutsideTimeline()).ToList();

        var min = tracked.Min(x => x.StartDate!.ToDateTime()!.Value);
        var max = DateTime.Today;

        var empty = tracked.Count == 0;

        SeriesShown = empty ? 0 : tracked.DistinctBy(x => x.Media.SeriesId).Count();
        SeriesTotal =             entries.DistinctBy(x => x.Media.SeriesId).Count();

        MinDay = Helpers.DateTimeToUnixDays(min);
        MaxDay = Helpers.DateTimeToUnixDays(max);
        Today  = Helpers.DateTimeToUnixDays(DateTime.Today);

        Years = Enumerable.Range(min.Year, max.Year - min.Year + 1).ToDictionary(x => x, DaysInYear);

        int DaysInYear(int year)
        {
            return year == min.Year
                ? (int)(new DateTime(year, 12, 31) - min).TotalDays
                : year == max.Year
                    ? (int)(max - new DateTime(year, 1, 1)).TotalDays
                    : DateTime.IsLeapYear(year) ? 366 : 365;
        }

        foreach (var entry in tracked)
        {
            entry.FixDates();
            entry.SetTooltip(min);
            entry.Media.SetAiringTooltip(MinDay, MaxDay);
        }
    }
}