namespace API.Services
{
    public static class Helpers
    {
        public static string Ending_ENG(int number, string word) => $"{number} {word}{(number == 1 ? "" : "s")}";

        public static DateTime UnixTimeStampToDateTime(double unixTimeStamp)
        {
            return DateTime.UnixEpoch.AddSeconds(unixTimeStamp).ToLocalTime();
        }
    }
}