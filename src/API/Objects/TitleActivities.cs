namespace API.Objects;

public class TitleActivities
{
    public int MaxProgressValue { get; set; }

    public List<ListActivity> Activities { get; private set; }

    public TitleActivities(List<ListActivity> activities)
    {
        Activities = activities.Where(x => x.Progress != 0).ToList();

        if (Activities.Count > 1) UniteActivitiesByDay();

        MaxProgressValue = Activities.Max(x => x.Progress);
    }

    private void UniteActivitiesByDay()
    {
        var lastI = 0;
        var day = Activities[0].Day;
        var len = Activities.Count;
        for (var thisI = 1; thisI < len; thisI++)
        {
            var lastActivity = Activities[lastI];
            var thisActivity = Activities[thisI];

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
                lastI = thisI;
            }
        }

        Activities = Activities.Where(x => x.Episodes != "x").ToList();
    }
}