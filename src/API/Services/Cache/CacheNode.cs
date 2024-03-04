namespace API.Services.Cache;

public class CacheNode<T>
{
    public CacheNode(T data, int updatedAt)
    {
        Data = data;
        UpdatedAt = updatedAt;
    }

    public int UpdatedAt { get; set; }
    public T   Data      { get; set; }

    public bool IsNotYoungerThan<TData>(CacheNode<TData> other)
    {
        return this.UpdatedAt <= other.UpdatedAt;
    }
}