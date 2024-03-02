using API.Services;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{
    [ApiController, Route("[controller]")]
    public class UserController : ControllerBase
    {
        private readonly ILogger<UserController> _logger;
        private readonly AniListExtractor _baka;

        public UserController(ILogger<UserController> logger, AniListExtractor extractor)
        {
            _logger = logger;
            _baka = extractor;
        }
    
        [HttpGet("/{id:int}")]
        public async Task<ActionResult<DTO.User>> Get(int id)
        {
            try
            {
                var client = new AniListNet.AniClient();

                var user = await client.GetUserAsync(id);

                return Ok(new DTO.User(user));
            }
            catch (Exception)
            {
                return NotFound();
            }
        }

        [HttpGet("/by-name/{username}")]
        public async Task<ActionResult<DTO.User>> Get(string username)
        {
            try
            {
                var client = new AniListNet.AniClient();

                var users = await client.SearchUserAsync(username);

                if (users.TotalCount != 1) throw new Exception();

                return Ok(new DTO.User(users.Data[0]));
            }
            catch (Exception)
            {
                return NotFound();
            }
        }

        /*[HttpGet("/{username}/{from:int?}/{to:int?}")]
        public async Task<ActionResult<UserViewModel>> Get(string username, int? from, int? to)
        {
            try
            {
                var timer = new Stopwatch();
                timer.Start();

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

                timer.Stop();
                _logger.LogInformation("USER: {name}. ENTRIES: {count}. TIME: {time:m\\:ss\\.fff}", user.User.name, user.History.Count, timer.Elapsed);
        
                return Ok(user);
            }
            catch (Exception)
            {
                return NotFound();
            }
        }*/
    }
}