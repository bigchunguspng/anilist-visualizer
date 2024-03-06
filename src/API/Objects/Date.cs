using AniListNet.Helpers;

namespace API.Objects;

#pragma warning disable CS8618

public class Date : IComparable<Date>
{
    [GqlSelection("year" )] public int? Year  { get; private set; }
    [GqlSelection("month")] public int? Month { get; private set; }
    [GqlSelection("day"  )] public int? Day   { get; private set; }

    public Date(DateTime dateTime)
    {
        Year  = dateTime.Year;
        Month = dateTime.Month;
        Day   = dateTime.Day;
    }

    public DateTime? ToDateTime()
    {
        if (Year.HasValue && Month.HasValue && Day.HasValue)
            return new DateTime(Year.Value, Month ?? 1, Day ?? 1);

        return null;
    }

    public static bool IsNull(Date? date) => date?.Year is null; // believe me, it's enough

    public int CompareTo(Date? other)
    {
        if (ReferenceEquals(this, other)) return 0;
        if (ReferenceEquals(null, other)) return 1;

        var year = Nullable.Compare(Year, other.Year);
        if (year != 0) return year;

        var month = Nullable.Compare(Month, other.Month);
        if (month != 0) return month;

        return Nullable.Compare(Day, other.Day);
    }

    public static bool operator > (Date a, Date b) => a.CompareTo(b) > 0;
    public static bool operator < (Date a, Date b) => a.CompareTo(b) < 0;
}