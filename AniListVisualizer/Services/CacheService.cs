namespace AniListVisualizer.Services;

public class CacheService<T>
{
    public readonly Dictionary<string, T> Data = new();

    public T Update(string key, T value)
    {
        Data[key] = value;
        return value;
    }
}