namespace API.Objects;

public class TitleActivities
{
    public int MaxProgressValue { get; set; }

    public List<ListActivity> Activities { get; private set; }

    public TitleActivities(List<ListActivity> activities)
    {
        Activities = activities.Where(x => x.Episodes != null).ToList();

        MaxProgressValue = Activities.Max(x => x.Progress);
        
        // todo unite activities from the same day
    }
}