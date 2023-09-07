using AniListVisualizer.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AniListVisualizer.Services;

public class AniListUserFinder : AniListEngine
{
    private const string USERS_QUERY = "query ($search: String) { Page(perPage: 10) { users(search: $search) { id name avatar { large medium } updatedAt } } }";

    public List<UserSearchResult> FindUsers(string search)
    {
        var query = new GraphQLQuery
        {
            Query = USERS_QUERY,
            Variables = new Dictionary<string, object> { { "search", search } }
        };
        var response = ExecuteRequest<int>(query);
        if (response.StatusCode.GetHashCode() == 200)
        {
            var json = DeserializeResponse(response);
            var data = JsonToDictionary((JObject)json["data"]);
            var page = JsonToDictionary((JObject)data["Page"]);
            
            var list = JsonConvert.DeserializeObject<List<UserSearchResult>>(((JArray)page["users"]).ToString())!;

            return list.OrderByDescending(u => u.updatedAt).ToList();
        }
        throw new Exception("Users not found.");
    }
}