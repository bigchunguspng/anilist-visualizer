using Newtonsoft.Json.Linq;
using RestSharp;

namespace API.Services
{
    public abstract class AniListEngine
    {
        private readonly RestClient anilist = new("https://graphql.anilist.co");
    
        protected RestResponse<T> ExecuteRequest<T>(GraphQLQuery query)
        {
            var request = new RestRequest("/", Method.Post) { RequestFormat = DataFormat.Json };
            request.AddJsonBody(query);
            return anilist.Execute<T>(request);
        }

        protected static T JTokenToObject<T>(string json, string path)
        {
            return SelectJToken(json, path).ToObject<T>()!;
        }

        protected static List<T> JTokenToList<T>(string json, string path)
        {
            return SelectJToken(json, path).Select(jt => jt.ToObject<T>()!).ToList();
        }

        private static JToken SelectJToken(string json, string path)
        {
            return JObject.Parse(json).SelectToken(path)!;
        }
    }

    public class GraphQLQuery
    {
        public required string Query { get; set; }
        public Dictionary<string, object> Variables { get; init; } = null!;
    }
}