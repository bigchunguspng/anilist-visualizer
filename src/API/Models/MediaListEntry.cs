// ReSharper disable InconsistentNaming

using System.Runtime.Serialization;

namespace API.Models
{
    public class MediaListEntry
    {
        public int id { get; set; }
        public Media media { get; set; } = null!;
        public EntryStatus status { get; set; }
        public int progress { get; set; }
        public FuzzyDate watching_start { get; set; }
        public FuzzyDate watching_end { get; set; }
        public int times_rewatched { get; set; }
        public int score { get; set; }

        public DateTime min, max;
    
        public HashSet<int> Years;
    
        [OnDeserialized]
        public void ProcessYears(StreamingContext context)
        {
            min = new DateTime(Math.Min(watching_start.Date.Ticks, watching_end.Date.Ticks));
            max = new DateTime(Math.Max(watching_start.Date.Ticks, watching_end.Date.Ticks));

            Years = Enumerable.Range(min.Year, max.Year - min.Year + 1).ToHashSet();
        }

        public bool EpisodeCountMatters => (media.episodes ?? media.chapters) != 1 && progress > 0;
    }

    public class Media
    {
        public int id { get; set; }
        public MediaType type { get; set; }
        public Dictionary<string, string?> title { get; set; } = null!;
        public int? episodes { get; set; }
        public int? duration { get; set; }
        public int? chapters { get; set; }
        public int? volumes { get; set; }
        public Dictionary<string, string?> coverImage { get; set; } = null!;
        public MediaSource? source { get; set; }
        public MediaSeason? season { get; set; }
        public FuzzyDate startDate { get; set; }
        public FuzzyDate   endDate { get; set; }
        public MediaFormat? format { get; set; }
        public MediaStatus? status { get; set; }
        public Relations relations { get; set; }
    
        public class Relations { public List<MediaEdge> edges; }
        public class MediaEdge { public MediaRelation type; public MediaKey node; }
        public class MediaKey  { public int id; }

        public HashSet<int> Related;

        [OnDeserialized]
        public void ProcessRelations(StreamingContext context)
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
}