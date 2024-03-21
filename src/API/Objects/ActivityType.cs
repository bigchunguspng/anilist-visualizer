using System.Runtime.Serialization;

namespace API.Objects;

public enum ActivityType
{
    [EnumMember(Value = "TEXT")] Text,
    [EnumMember(Value = "ANIME_LIST")] AnimeList,
    [EnumMember(Value = "MANGA_LIST")] MangaList,
    [EnumMember(Value = "MESSAGE")] Message,
    [EnumMember(Value = "MEDIA_LIST")] MediaList
}