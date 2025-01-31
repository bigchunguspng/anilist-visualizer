using API.Services;

namespace API.Objects;

/// <summary>
/// Activities of different titles
/// </summary>
public class MixedActivities
{
    public int MaxProgressValue { get; set; }

    public List<NamedInt> SmallerUnits { get; set; } // e.g. days
    public List<NamedInt>  BiggerUnits { get; set; } // e.g. months

    public record NamedInt(string Title, int Value);

    // day - list of activities (united)
    public Dictionary<int, List<ListActivityWithMedia>> Activities { get; private set; }

    public MixedActivities(List<ListActivityWithMedia> activities)
    {
        activities = activities.Where(x => x.Progress != 0).ToList();

        var minDays = activities.Min(x => x.Day);
        var maxDays = activities.Max(x => x.Day);
        var minDate = Helpers.UnixDaysToDateTime(minDays);
        var maxDate = Helpers.UnixDaysToDateTime(maxDays);

        SmallerUnits = new List<NamedInt>();
        for (var date = minDate; date <= maxDate; date = date.AddDays(1))
        {
            SmallerUnits.Add(new NamedInt(date.Day.ToString(), 1));
        }

        BiggerUnits = new List<NamedInt>();
        for (var date = minDate; date <= maxDate; date = date.AddMonths(1))
        {
            var first = date.Year == minDate.Year && date.Month == minDate.Month;
            var last  = date.Year == maxDate.Year && date.Month == maxDate.Month;
            var daysInMonth = first
                ? DateTime.DaysInMonth(date.Year, date.Month) - minDate.Day + 1
                : last
                    ? maxDate.Day
                    : DateTime.DaysInMonth(date.Year, date.Month);
            BiggerUnits.Add(new NamedInt(date.ToString("MMM"), daysInMonth));
        }

        if (activities.Count == 0) Activities = new Dictionary<int, List<ListActivityWithMedia>>();
        else
        {
            var activitiesByMedia = activities.GroupBy(x => x.Media.Id).ToDictionary(g => g.Key, g => g.ToList());
            foreach (var mediaActivities in activitiesByMedia.Values)
            {
                TitleActivities.UniteActivitiesByDay(mediaActivities);
            }

            MaxProgressValue = activitiesByMedia.Values.Select(list => list.Max(x => x.Progress)).Max();

            Activities = Enumerable
                .Range(minDays, maxDays - minDays + 1)
                .ToDictionary(x => x, _ => new List<ListActivityWithMedia>());

            foreach (var activity in activitiesByMedia.SelectMany(x => x.Value))
            {
                Activities[activity.Day].Add(activity);
            }
        }
    }
}