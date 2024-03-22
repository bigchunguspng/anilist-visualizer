namespace API.Services
{
    public static class Helpers
    {
        private const int SecondsInOneDay = 60 * 60 * 24;


        public static DateTime UnixTimeStampToDateTime(int unixTimeStamp)
        {
            return DateTimeOffset.FromUnixTimeSeconds(unixTimeStamp).LocalDateTime;
        }

        public static int ToUnixTimeStamp(this DateTime dateTime)
        {
            return (int) new DateTimeOffset(dateTime).ToUnixTimeSeconds();
        }

        public static int GetDateTimeMinutesAgo(double minutes)
        {
            return ToUnixTimeStamp(DateTime.Now - TimeSpan.FromMinutes(minutes));
        }


        /// <summary> Returns the number of days since 1 Jan 1970 </summary>
        public static int ToUnixDays(this DateTime dateTime)
        {
            return SecondsToDays(ToUnixTimeStamp(dateTime));
        }

        public static DateTime UnixDaysToDateTime(int days)
        {
            return UnixTimeStampToDateTime(DaysToSeconds(days));
        }


        public static int SecondsToDays(int seconds)
        {
            return seconds / SecondsInOneDay;
        }

        public static int DaysToSeconds(int days)
        {
            return days * SecondsInOneDay;
        }


        public static string DateToStringLong (DateTime date) => $"{date:MMM yyyy}";
        public static string DateToStringShort(DateTime date) => $"{date:d MMM}";
        public static string DateToStringFull (DateTime date) => $"{date:d MMM yyyy}";

        public static string GetDateRange(DateTime a, DateTime? b, Func<DateTime, string> format, char arrow = '➽')
        {
            return b is null
                ? $"{format(a)} {arrow}"
                : $"{format(a)} - {format(b.Value)}";
        }
    }
}