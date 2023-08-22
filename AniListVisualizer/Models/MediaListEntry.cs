// ReSharper disable InconsistentNaming

namespace AniListVisualizer.Models;

public class MediaListEntry
{
    public int id;
    public Media media = null!;
    public EntryStatus status;
    public int progress;
    public FuzzyDate watching_start;
    public FuzzyDate watching_end;
    public int times_rewatched;
    public int score;
}

public class Media
{
    public int id;
    public MediaType type;
    public Dictionary<string, string> title = null!;
    public int? episodes;
    public int? duration;
    public int? chapters;
    public int? volumes;
    public Dictionary<string, string> coverImage = null!;
    public MediaSource? source;
    public MediaSeason? season;
    public FuzzyDate startDate;
    public FuzzyDate   endDate;
    public MediaFormat? format;
    public MediaStatus? Status;
}

public struct FuzzyDate
{
    public int? year, month, day;
}

public enum EntryStatus
{
    CURRENT,
    PLANNING,
    COMPLETED,
    DROPPED,
    PAUSED,
    REPEATING
}

public enum MediaType
{
    ANIME, MANGA
}

public enum MediaSource
{
    ORIGINAL,
    MANGA,
    LIGHT_NOVEL,
    VISUAL_NOVEL,
    VIDEO_GAME,
    OTHER,
    NOVEL,
    DOUJINSHI,
    ANIME,
    WEB_NOVEL,
    LIVE_ACTION,
    GAME,
    COMIC,
    MULTIMEDIA_PROJECT,
    PICTURE_BOOK
}

public enum MediaSeason
{
    WINTER, SPRING, SUMMER, FALL
}

public enum MediaFormat
{
    TV, TV_SHORT, MOVIE, SPECIAL, OVA, ONA, MUSIC, MANGA, NOVEL, ONE_SHOT
}

public enum MediaStatus
{
    FINISHED, RELEASING, NOT_YET_RELEASED, CANCELLED, HIATUS
}