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
    }
}