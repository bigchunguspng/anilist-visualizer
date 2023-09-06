// ReSharper disable InconsistentNaming

namespace AniListVisualizer.Models;

public class UserViewModel
{
    public required User User;
    public required List<MediaListEntry> History;
}

public class User
{
    public int id;
    public string name = null!;
    public Dictionary<string, string> avatar = null!;

    public string URL => $"https://anilist.co/user/{name}";
}