namespace API.Objects;

#pragma warning disable CS8618

public class TimelineItem
{
    public int?  Offset { get; set; }
    public int?  Length { get; set; }
    public ToolTip  Tip { get; set; }
    public bool Stripes { get; set; }

    public class ToolTip
    {
        public string  DateRange    { get; set; }
        public int?    Episodes     { get; set; } // or chapters
        public string? AverageSpeed { get; set; }
    }
}