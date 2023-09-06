using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RestSharp;

namespace AniListVisualizer.Services;

public abstract class AniListEngine
{
    private readonly RestClient anilist = new("https://graphql.anilist.co");
    
    protected RestResponse<T> ExecuteRequest<T>(GraphQLQuery query)
    {
        var request = new RestRequest("/", Method.Post) { RequestFormat = DataFormat.Json };
        request.AddJsonBody(query);
        return anilist.Execute<T>(request);
    }

    protected static Dictionary<string, object> DeserializeResponse(RestResponse response)
    {
        return JsonConvert.DeserializeObject<Dictionary<string, object>>(response.Content!)!;
    }

    protected static Dictionary<string, object> JsonToDictionary(JToken j)
    {
        return j.ToObject<Dictionary<string, object>>() ?? throw new NullReferenceException();
    }
}

public class GraphQLQuery
{
    public required string Query { get; set; }
    public Dictionary<string, object> Variables { get; init; } = null!;
}