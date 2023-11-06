using AniListVisualizer.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AniListVisualizer.Services;

public class AniListExtractor : AniListEngine
{
    private const string USER_ID_QUERY = "query ($name: String) { User(name: $name) { id name avatar { large medium } updatedAt } }";
    private const string MEDIALIST_QUERY =
        """
        query ($id: Int, $status: MediaListStatus, $page: Int) {
            Page(page: $page) {
            mediaList(userId: $id, status: $status) {
              id
              media {
                id
                type
                title { romaji english native }
                episodes
                duration
                chapters
                volumes
                coverImage { extraLarge large medium color }
                source
                season
                startDate { year month day }
                endDate   { year month day }
                format
                status
                relations { edges { type: relationType node { id } } } }
              status
              progress
              watching_start: startedAt { year month day }
              watching_end: completedAt { year month day }
              times_rewatched: repeat
              score: score(format: POINT_100)
            }
            pageInfo { total currentPage lastPage hasNextPage perPage }
          }
        }
        """;

    private static readonly EntryStatus[] Statuses =
    {
        EntryStatus.CURRENT,
        EntryStatus.COMPLETED,
        EntryStatus.DROPPED,
        EntryStatus.PAUSED,
        EntryStatus.REPEATING
    };

    public async Task<UserViewModel> GetUserViewModel(string username)
    {
        var user = GetAniListUser(username);
        var list = new List<MediaListEntry>();

        var tasks = Statuses.Select(status => Task.Run(() => GetOtakuHistory(user.id, status))).ToArray();
        
        await Task.WhenAll(tasks);
        foreach (var task in tasks)
        {
            list.AddRange(task.Result);
        }

        GroupBySeries(list);

        return new UserViewModel { User = user, History = list };
    }

    private User GetAniListUser(string username)
    {
        var query = new GraphQLQuery
        {
            Query = USER_ID_QUERY,
            Variables = new Dictionary<string, object> { { "name", username } }
        };
        var response = ExecuteRequest<int>(query);
        if (response.StatusCode.GetHashCode() == 200)
        {
            var json = DeserializeResponse(response);
            var data = JsonToDictionary((JObject)json["data"]);
            return JsonConvert.DeserializeObject<User>(((JObject)data["User"]).ToString())!;
        }
        throw new Exception("User Not Found");
    }

    private List<MediaListEntry> GetOtakuHistory(int user, EntryStatus status, int page = 1)
    {
        var list = new List<string>();
        var query = new GraphQLQuery
        {
            Query = MEDIALIST_QUERY,
            Variables = new Dictionary<string, object> { { "id", user }, { "status", status.ToString() }, { "page", page } }
        };
        
        var enough = false;
        while (!enough)
        {
            var response = ExecuteRequest<int>(query);
            if (response.StatusCode.GetHashCode() == 200)
            {
                var json = DeserializeResponse(response);
                var data = JsonToDictionary((JObject)json["data"]);
                var part = JsonToDictionary((JObject)data["Page"]);
                
                list.AddRange(((JArray)part["mediaList"]).Select(x => x.ToString()));

                var nextpage = (bool)JsonToDictionary((JObject)part["pageInfo"])["hasNextPage"];
                if (nextpage)
                {
                    page++;
                    query.Variables["page"] = page;
                }
                else
                    enough = true;
            }
            else
                return new List<MediaListEntry>();
        }
        
        return list.Select(json => JsonConvert.DeserializeObject<MediaListEntry>(json)!).ToList();
    }

    private static void GroupBySeries(List<MediaListEntry> list)
    {
        var relations = list.ToDictionary(x => x.media.id, x => x.media.Related);

        foreach (var relation in relations)
        {
            if (relation.Value.Count == 0) continue;

            var related = relations.Where(x => x.Key != relation.Key && x.Value.Overlaps(relation.Value));
            foreach (var link in related)
            {
                relation.Value.UnionWith(link.Value);
                relations[link.Key].Clear();
            }
        }

        foreach (var relation in relations.Where(x => x.Value.Count > 0))
        {
            var series = relation.Value.Min();
            foreach (var id in relation.Value)
            {
                var entry = list.FirstOrDefault(x => x.media.id == id);
                if (entry is not null)
                    entry.media.Series = series;
            }
        }
    }
}