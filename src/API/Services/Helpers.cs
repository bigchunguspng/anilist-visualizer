namespace API.Services
{
    public static class Helpers
    {
        public static string Ending_ENG(int number, string word) => $"{number} {word}{(number == 1 ? "" : "s")}";

        public static DateTime UnixTimeStampToDateTime(int unixTimeStamp)
        {
            return DateTimeOffset.FromUnixTimeSeconds(unixTimeStamp).LocalDateTime;
        }

        public static int DateTimeToUnixTimeStamp(DateTime dateTime)
        {
            return (int) new DateTimeOffset(dateTime).ToUnixTimeSeconds();
        }

        public static int SecondsToDays(int seconds)
        {
            const int secondsInOneDay = 60 * 60 * 24;
            return seconds / secondsInOneDay;
        }

        public static string DateToStringShort(DateTime date) => $"{date:MMM d}";
        public static string DateToStringLong (DateTime date) => $"{date:MMM yyyy}";

        public static string GetDateRange(DateTime a, DateTime? b, Func<DateTime, string> format, char arrow = '➽')
        {
            return b is null
                ? $"{format(a)} {arrow}"
                : $"{format(a)} - {format(b.Value)}";
        }
    }
}