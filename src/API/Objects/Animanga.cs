using System.Globalization;
using API.Services;
using API.Services.Cache;

namespace API.Objects;

public class Animanga
{
    public int MinDay { get; private set; } // min & max days of the current timeframe
    public int MaxDay { get; private set; }
    public int Today  { get; private set; } // (days since 1 Jan 1970)

    public int[]                   Years            { get; private set; } // all years
    public Dictionary<string, int> TimelineSections { get; private set; } // durations in days

    public int SeriesShown { get; private set; }
    public int SeriesTotal { get; private set; }

    public List<MediaEntry> Entries { get; private set; }


    public Animanga(List<MediaEntry> entries, Cache<TitleActivities>? cache, int? from = null, int? to = null)
    {
        var subframe = from is not null && to is not null;

        Entries = entries;

        var showable = entries.Where(x => !x.IsOutsideTimeline()).ToList();

        var allMin = showable.Min(x => x.GetStartDate()!.ToDateTime()!.Value);
        var allMax = DateTime.Today;

        var min = subframe ? new DateTime(from!.Value, 1, 1) : allMin;
        var max = subframe ? new DateTime(to!.Value, 12, 31) : allMax;

        var visible = subframe
            ? showable
                .Where(x => x.GetStartDate()!.Year <= to && (x.GetCompleteDate()?.Year ?? DateTime.Today.Year) >= from)
                .ToList()
            : showable;

        var empty = visible.Count == 0;

        SeriesShown = empty ? 0 : visible.DistinctBy(x => x.Media.SeriesId).Count();
        SeriesTotal =             entries.DistinctBy(x => x.Media.SeriesId).Count();

        MinDay = min.ToUnixDays();
        MaxDay = max.ToUnixDays();
        Today  = DateTime.Today.ToUnixDays();

        Years = YearsRange(allMin.Year, allMax.Year).ToArray();
        TimelineSections = max.Year - min.Year == 0
            ? Enumerable.Range(1, 12).ToDictionary(MonthName, x => DaysInMonth(min.Year, x))
            : YearsRange(min.Year, max.Year).ToDictionary(x => x.ToString(), DaysInYear);

        IEnumerable<int> YearsRange(int a, int b) => Enumerable.Range(a, b - a + 1);

        int DaysInYear(int year)
        {
            return year == min.Year
                ? new DateTime(year, 12, 31).ToUnixDays() - MinDay + 1
                : year == max.Year
                    ? MaxDay - new DateTime(year, 1, 1).ToUnixDays() + 1
                    : DateTime.IsLeapYear(year) ? 366 : 365;
        }

        int DaysInMonth(int year, int month)
        {
            var days = DateTime.DaysInMonth(year, month);
            return year == min.Year && month == min.Month
                ? new DateTime(year, month, days).ToUnixDays() - MinDay + 1
                : year == max.Year && month == max.Month
                    ? MaxDay - new DateTime(year, month, 1).ToUnixDays() + 1
                    : days;
        }

        string MonthName(int month)
        {
            return CultureInfo.CurrentCulture.DateTimeFormat.GetAbbreviatedMonthName(month);
        }

        foreach (var entry in showable)
        {
            entry.SetTooltip(MinDay, MaxDay, Today, cache);
            entry.Media.SetAiringTooltip(MinDay, MaxDay, Today);
        }
    }
}