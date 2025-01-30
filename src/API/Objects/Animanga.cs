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


    public Animanga(List<MediaEntry> entries, Cache<TitleActivities>? cache, int? from = null, int? to = null, bool lastYear = false)
    {
        var subframe = from != null && to != null || lastYear;

        Entries = entries;

        var showableEntries = entries.Where(x => !x.IsOutsideTimeline()).ToList();

        var allMin = showableEntries.Min(x => x.GetStartDate()!.ToDateTime()!.Value);
        var allMax = DateTime.Today;

        var shownMin = subframe
            ? lastYear
                ? allMax.AddDays(-365)
                : new DateTime(from!.Value, 1, 1)
            : allMin;
        var shownMax = subframe
            ? lastYear
                ? allMax
                : new DateTime(to!.Value, 12, 31)
            : allMax;

        var visible = subframe
            ? showableEntries
                .Where(x => x.GetStartDate()!.ToDateTime() <= shownMax && (x.GetCompleteDate()?.ToDateTime() ?? DateTime.Today) >= shownMin)
                .ToList()
            : showableEntries;

        var empty = visible.Count == 0;

        SeriesShown = empty ? 0 : visible.DistinctBy(x => x.Media.SeriesId).Count();
        SeriesTotal =             entries.DistinctBy(x => x.Media.SeriesId).Count();

        MinDay = shownMin.ToUnixDays();
        MaxDay = shownMax.ToUnixDays();
        Today  = DateTime.Today.ToUnixDays();

        Years = YearsRange(allMin.Year, allMax.Year).ToArray();
        TimelineSections = lastYear
            ? MonthDaysAcrossYears(shownMin, shownMax)
            : shownMax.Year - shownMin.Year == 0
                ? Enumerable.Range(1, 12).ToDictionary(MonthName, x => DaysInMonth(shownMin.Year, x))
                : YearsRange(shownMin.Year, shownMax.Year).ToDictionary(x => x.ToString(), DaysInYear);

        foreach (var entry in showableEntries)
        {
            entry.SetTooltip(MinDay, MaxDay, Today, cache);
            entry.Media.SetAiringTooltip(MinDay, MaxDay, Today);
        }

        return;


        int DaysInYear(int year)
        {
            return year == shownMin.Year
                ? new DateTime(year, 12, 31).ToUnixDays() - MinDay + 1
                : year == shownMax.Year
                    ? MaxDay - new DateTime(year, 1, 1).ToUnixDays() + 1
                    : DateTime.IsLeapYear(year) ? 366 : 365;
        }

        int DaysInMonth(int year, int month)
        {
            var days = DateTime.DaysInMonth(year, month);
            return year == shownMin.Year && month == shownMin.Month
                ? new DateTime(year, month, days).ToUnixDays() - MinDay + 1
                : year == shownMax.Year && month == shownMax.Month
                    ? MaxDay - new DateTime(year, month, 1).ToUnixDays() + 1
                    : days;
        }
    }

    private static IEnumerable<int> YearsRange(int a, int b) => Enumerable.Range(a, b - a + 1);

    private static string MonthName(int month)
    {
        return CultureInfo.CurrentCulture.DateTimeFormat.GetAbbreviatedMonthName(month);
    }

    private static Dictionary<string, int> MonthDaysAcrossYears(DateTime min, DateTime max)
    {
        var result = new Dictionary<string, int>();
        var year = min.Year;
        var month = min.Month;
        var date = new DateTime(year, month, 1);
        var first = true;
        while (date <= max)
        {
            var last = year == max.Year && month == max.Month;

            var monthName = first || last 
                ? $"{MonthName(month)} '{date:yy}"
                :    MonthName(month);

            var days = first
                ? DateTime.DaysInMonth(year, month) - min.Day + 1
                : last
                    ? max.Day
                    : DateTime.DaysInMonth(year, month);

            result.Add(monthName, days);

            if (++month > 12)
            {
                year++;
                month = 1;
            }
            date = new DateTime(year, month, 1);
            first = false;
        }

        return result;
    }
}