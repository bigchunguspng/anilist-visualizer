namespace API.Objects;

#pragma warning disable CS8618

public class TimelineItem : BaseTimelineItem
{
    public ToolTip  Tip { get; set; }
    public bool Stripes { get; set; }

    public class ToolTip
    {
        public string  DateRange    { get; set; }
        public int?    Episodes     { get; set; } // or chapters
        public string? AverageSpeed { get; set; }
    }
}

public class AiringTimelineItem : BaseTimelineItem
{
    public string Season { get; set; }
}

public class BaseTimelineItem
{
    public int Offset { get; set; }
    public int Length { get; set; }
}