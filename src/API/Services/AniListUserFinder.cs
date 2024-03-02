using API.Models;

namespace API.Services
{
    public class AniListUserFinder : AniListEngine
    {
        private const string USERS_QUERY = "query ($search: String) { Page(perPage: 10) { users(search: $search) { id name avatar { large medium } updatedAt } } }";

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
                var list = JTokenToList<User>(response.Content!, "data.Page.users");

                return list.OrderByDescending(u => u.updatedAt).ToList();
            }
            throw new Exception("Users not found.");
        }
    }
}