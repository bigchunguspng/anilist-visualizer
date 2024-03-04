namespace API.Services.Cache;

public class Cache<T>
{
    private Dictionary<int, CacheNode<T>> Data { get; } = new();

    public T Update(int key, T value, int updatedAt)
    {
        if (Data.TryGetValue(key, out var node))
        {
            if (node.UpdatedAt < updatedAt)
            {
                node.Data = value;
                node.UpdatedAt = updatedAt;
            }
        }
        else
            Data[key] = new CacheNode<T>(value, updatedAt);

        return value;
    }

    public CacheNode<T>? GetNodeOrNull(int key) => Data.TryGetValue(key, out var node) ? node : null;
}