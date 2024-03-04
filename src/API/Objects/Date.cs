using AniListNet.Helpers;

namespace API.Objects;

#pragma warning disable CS8618

public class Date : IComparable<Date>
{
    [GqlSelection("year" )] public int? Year  { get; private set; }
    [GqlSelection("month")] public int? Month { get; private set; }
    [GqlSelection("day"  )] public int? Day   { get; private set; }

    public DateTime? ToDateTime()
    {
        if (Year.HasValue && Month.HasValue && Day.HasValue)
            return new DateTime(Year.Value, Month.Value, Day.Value);
        return null;
    }
    
    //private DateTime GetDate() => year is null ? DateTime.Today : new DateTime(year.Value, month ?? 1, day ?? 1);

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
}