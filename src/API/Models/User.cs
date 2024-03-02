// ReSharper disable InconsistentNaming

using System.Text;

namespace API.Models
{
    public class User
    {
        public int id { get; set; }
        public string name { get; set; } = null!;
        public Dictionary<string, string> avatar { get; set; } = null!;
        public long updatedAt { get; set; }

        public string URL => $"https://anilist.co/user/{name}";
    
        public string LastSeen()
        {
            var date = DateTimeOffset.FromUnixTimeSeconds(updatedAt);
            var time = DateTime.Now - date;

            var s = new StringBuilder();
            if (time.Days > 365)
            {
                var years = time.Days / 365;
                s.Append(years).Append(" year").Append(years > 1 ? "s" : "");
            }
            else if (time.Days > 31)
            {
                var months = time.Days * 2 / 61;
                s.Append(months).Append(" month").Append(months > 1 ? "s" : "");
            }
            else if (time.Days    > 0) s.Append(time.Days   ).Append(" day"   ).Append(time.Days    > 1 ? "s" : "");
            else if (time.Hours   > 0) s.Append(time.Hours  ).Append(" hour"  ).Append(time.Hours   > 1 ? "s" : "");
            else if (time.Minutes > 0) s.Append(time.Minutes).Append(" minute").Append(time.Minutes > 1 ? "s" : "");
            else                       s.Append("a few seconds");

            return s.Append(" ago").ToString();
        }
    }
}