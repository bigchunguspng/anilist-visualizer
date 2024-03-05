using AniListNet;
using AniListNet.Parameters;
using API.Objects;
using API.Services.Cache;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{
    [ApiController, Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly ILogger<UserController> _logger;
        private readonly AniClient _client;
        private readonly Cache<User> _userCache;

        public UserController(ILogger<UserController> logger, AniClient client, Cache<User> userCache)
        {
            _logger = logger;
            _client = client;
            _userCache = userCache;
        }
    
        [HttpGet("{id:int}")]
        public async Task<ActionResult<User>> Get(int id)
        {
            try
            {
                var user = await _client.GetAsync<User>(id, "User");
                LogUser(user);
                UpdateUserCache(user);
                return Ok(user);
            }
            catch (Exception)
            {
                return NotFound();
            }
        }

        [HttpGet("by-name/{username}")]
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
                LogUser(user);
                UpdateUserCache(user);
                return Ok(user);
            }
            catch (Exception)
            {
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

                _logger.LogInformation("Users Found: {count} [{query}]", result.Count, query);
                return Ok(result);
            }
            catch (Exception)
            {
                return BadRequest();
            }
        }

        private void UpdateUserCache(User user)
        {
            _userCache.Update(user.Id, user, user.UpdatedAt);
        }

        private void LogUser(User user)
        {
            _logger.LogInformation("USER: [{id} - {name}]", user.Id, user.Name);
        }

        private void LogNotFound(string query)
        {
            _logger.LogInformation("No User Found [{query}]", query);
        }

        /*[HttpGet("/{username}/{from:int?}/{to:int?}")]
        public async Task<ActionResult<UserViewModel>> Get(string username, int? from, int? to)
        {
                var user = await _baka.GetUserViewModel(username);

                if (from is not null)
                {
                    var same = to is null;

                    var min = same ? from.Value : Math.Min(from.Value, to!.Value);
                    var max = same ? from.Value : Math.Max(from.Value, to!.Value);

                    user.Years = same ? new HashSet<int> { min } : Enumerable.Range(min, max - min + 1).ToHashSet();
                }
                else
                    user.Years = null;
        }*/
    }
}