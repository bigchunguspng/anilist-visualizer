namespace API.Objects;

/// <summary>
/// Activities of the same title
/// </summary>
public class TitleActivities
{
    public int MaxProgressValue { get; set; }

    public List<ListActivity> Activities { get; private set; }

    public TitleActivities(List<ListActivity> activities)
    {
        Activities = activities.Where(x => x.Progress != 0).ToList();

        if (Activities.Count > 1) UniteActivitiesByDay(Activities);

        MaxProgressValue = Activities.Max(x => x.Progress);
    }

    public static void UniteActivitiesByDay<T>(List<T> activities) where T : IActivity
    {
        var day = activities[0].Day;
        var len = activities.Count;
        for (int i_last = 0, i_this = 1; i_this < len; i_this++)
        {
            var lastActivity = activities[i_last];
            var thisActivity = activities[i_this];

            if (thisActivity.Day == day)
            {
                var ep1 = lastActivity.Episodes!.Split(' ')[0];
                var epN = thisActivity.Episodes?.Split(' ')[^1] ?? $"{int.Parse(ep1) + 1}";
                lastActivity.Episodes = $"{ep1} - {epN}";
                thisActivity.Episodes = "x";
            }
            else
            {
                day = thisActivity.Day;
                i_last = i_this;
            }
        }

        activities.RemoveAll(x => x.Episodes == "x");
    }
}