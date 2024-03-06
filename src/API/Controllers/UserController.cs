using AniListNet;
using AniListNet.Parameters;
using API.Objects;
using API.Services.Cache;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{
    [ApiController, Route("api/[controller]")]
    public class UserController : ControllerWithLogger
    {
        private readonly AniClient _client;
        private readonly Cache<User> _userCache;

        public UserController(ILogger<UserController> logger, AniClient client, Cache<User> userCache) : base(logger)
        {
            _client = client;
            _userCache = userCache;
        }
    
        [HttpGet("{id:int}")]
        public async Task<ActionResult<User>> Get(int id)
        {
            try
            {
                var user = await _client.GetAsync<User>(id, "User");
                UpdateUserCache(user);
                LogUser(user);
                return Ok(user);
            }
            catch (Exception e)
            {
                LogException(e);
                return NotFound();
            }
        }

        [HttpGet("{username}")]
        public async Task<ActionResult<User>> Get(string username)
        {
            try
            {
                var filter = new SearchUserFilter { Query = username };
                var options = new AniPaginationOptions(1, 1);
                var users = await _client.SearchAsync<User>(filter, "users", options);

                if (users.TotalCount < 1)
                {
                    LogNotFound(username);
                    return NotFound();
                }

                var user = users.Data[0];
                UpdateUserCache(user);
                LogUser(user);
                return Ok(user);
            }
            catch (Exception e)
            {
                LogException(e);
                return BadRequest();
            }
        }

        [HttpGet("search/{query}")]
        public async Task<ActionResult<IEnumerable<User>>> Search(string query)
        {
            try
            {
                var filter = new SearchUserFilter { Query = query.Replace(" ", "") };
                var users = await _client.SearchAsync<User>(filter, "users");

                var result = users.Data.OrderByDescending(u => u.UpdatedAt).ToList();

                LogUsersFound(query, result.Count);
                return Ok(result);
            }
            catch (Exception e)
            {
                LogException(e);
                return BadRequest();
            }
        }

        private void UpdateUserCache(User user)
        {
            _userCache.Update(user.Id, user, user.UpdatedAt);
        }

        private void LogUser(User user)
        {
            Logger.LogInformation("USER: [{id} / {name}]", user.Id, user.Name);
        }

        private void LogUsersFound(string query, int count)
        {
            Logger.LogInformation("USERS FOUND: {count} [{query}]", count, query);
        }

        private void LogNotFound(string query)
        {
            Logger.LogInformation("NO USER FOUND [{query}]", query);
        }
    }
}