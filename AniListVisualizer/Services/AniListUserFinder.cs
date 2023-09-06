using AniListVisualizer.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AniListVisualizer.Services;

public class AniListUserFinder : AniListEngine
{
    private const string USERS_QUERY = "query ($search: String) { Page(perPage: 10) { users(search: $search) { id name avatar { large medium } } } }";

    public List<User> FindUsers(string search)
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
            
            return JsonConvert.DeserializeObject<List<User>>(((JArray)page["users"]).ToString())!;
        }
        throw new Exception("Users not found.");
    }
}