namespace API.Models
{
    public class UserViewModel
    {
        public required User User { get; set; }
        public required List<MediaListEntry> History { get; set; }

        public HashSet<int>? Years { get; set; }
    }
}