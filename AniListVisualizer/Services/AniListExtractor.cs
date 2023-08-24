using AniListVisualizer.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RestSharp;

namespace AniListVisualizer.Services;

public class AniListExtractor
{
    private readonly RestClient anilistClient = new("https://graphql.anilist.co");

    private const string USER_ID_QUERY = "query ($name: String) { User(name: $name) { id name avatar { large medium } } }";
    private const string MEDIALIST_QUERY =
        """
        query ($id: Int, $page: Int) {
            Page(page: $page) {
            mediaList(userId: $id) {
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
              }
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

    public UserViewModel GetUserViewModel(string username)
    {
        var user = GetAniListUser(username);
        var list = GetOtakuHistory(user.id);

        return new UserViewModel { User = user, History = list };
    }

    public User GetAniListUser(string username)
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
        throw new Exception("User not found.");
    }

    private List<MediaListEntry> GetOtakuHistory(int user, int page = 1)
    {
        var list = new List<string>();
        var query = new GraphQLQuery
        {
            Query = MEDIALIST_QUERY,
            Variables = new Dictionary<string, object> { { "id", user }, { "page", page } }
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

    private RestResponse<T> ExecuteRequest<T>(GraphQLQuery query)
    {
        var request = new RestRequest("/", Method.Post) { RequestFormat = DataFormat.Json };
        request.AddJsonBody(query);
        return anilistClient.Execute<T>(request);
    }

    private static Dictionary<string, object> DeserializeResponse(RestResponse response)
    {
        return JsonConvert.DeserializeObject<Dictionary<string, object>>(response.Content!)!;
    }

    private static Dictionary<string, object> JsonToDictionary(JToken j)
    {
        return j.ToObject<Dictionary<string, object>>() ?? throw new NullReferenceException();
    }
}

public class GraphQLQuery
{
    public required string Query { get; set; }
    public Dictionary<string, object> Variables { get; init; } = null!;
}