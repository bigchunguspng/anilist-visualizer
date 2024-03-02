using AniListNet.Objects;

namespace API.DTO;

public class User
{
    public int    Id     { get; private set; }
    public string Name   { get; private set; }
    public Image  Avatar { get; private set; }
    public Uri    Url    { get; private set; }
    
    public User(AniListNet.Objects.User user)
    {
        Id     = user.Id;
        Name   = user.Name;
        Avatar = user.Avatar;
        Url    = user.Url;
    }
}