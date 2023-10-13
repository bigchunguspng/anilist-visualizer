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

    public bool EpisodeCountMatters => (media.episodes ?? media.chapters) != 1 && progress > 0;
}

public class Media
{
    public int id;
    public MediaType type;
    public Dictionary<string, string?> title = null!;
    public int? episodes;
    public int? duration;
    public int? chapters;
    public int? volumes;
    public Dictionary<string, string?> coverImage = null!;
    public MediaSource? source;
    public MediaSeason? season;
    public FuzzyDate startDate;
    public FuzzyDate   endDate;
    public MediaFormat? format;
    public MediaStatus? status;
    public Relations relations;
    
    public class Relations { public List<MediaEdge> edges; }
    public class MediaEdge { public MediaRelation type; public MediaKey node; }
    public class MediaKey  { public int id; }

    public HashSet<int> Related;

    public void ProcessRelations()
    {
        Related = relations.edges.Where(x => x.type != MediaRelation.CHARACTER).Select(x => x.node.id).ToHashSet();
        Related.Add(id);
    }

    public int Series;

    /// <summary> Returns Anilist URL of the media. </summary>
    public string URL => $"{AnimeOrManga}/{id}";

    /// <summary> Returns a string like "FALL 2023". </summary>
    public string SeasonAndYear => $"{season.ToString()} {startDate.year}";

    /// <summary> Returns "anime" or "manga" based on media type. </summary>
    public string AnimeOrManga => type.ToString().ToLower();

    /// <summary> Returns "episode" or "chapter" based on media type. </summary>
    public string EpisodeOrChapter => type == MediaType.ANIME ? "episode" : "chapter";
}

public struct FuzzyDate
{
    public int? year, month, day;

    private DateTime? _date;
    public  DateTime   Date => _date ??= GetDate();
    
    private DateTime GetDate() => year is null ? DateTime.Today : new DateTime(year.Value, month ?? 1, day ?? 1);
    
    public override string ToString() => LongDate();

    public string ShortDate() => year is null ? "…" : FormatShort(this);
    public string  LongDate() => year is null ? "…" : FormatLong (this);

    public static string FormatShort(FuzzyDate date) => $"{date.Date:MMM d}";
    public static string FormatLong (FuzzyDate date) => $"{date.Date:MMM yyyy}";

    public static string DateRange
    (
        FuzzyDate a,
        FuzzyDate b,
        Func<FuzzyDate, string> format,
        char arrow = '➽'
    )
        => b.year is null ? $"{format(a)} {arrow}" : $"{format(a)} - {format(b)}";
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

public enum MediaRelation
{
    ADAPTATION,
    PREQUEL,
    SEQUEL,
    PARENT,
    SIDE_STORY,
    CHARACTER,
    SUMMARY,
    ALTERNATIVE,
    SPIN_OFF,
    OTHER,
    SOURCE,
    COMPILATION,
    CONTAINS
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