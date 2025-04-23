using System.Reflection;
using System.Text.Json.Serialization;

namespace Utils;

public static class JsonSchemaExtensions
{
    public static object GenerateJsonSchema(this Type type)
    {
        var properties = new Dictionary<string, object>();

        foreach (var property in type.GetProperties())
        {
            var propertyName = GetJsonPropertyName(property) ?? property.Name.ToLowerInvariant();
            var propertyType = GetPropertySchemaType(property.PropertyType);

            properties[propertyName] = propertyType;
        }

        return new
        {
            type = "object",
            properties,
            required = properties.Keys.ToArray()
        };
    }

    private static string? GetJsonPropertyName(PropertyInfo property)
    {
        var jsonAttribute = property.GetCustomAttribute<JsonPropertyNameAttribute>();
        return jsonAttribute?.Name;
    }

    private static object GetPropertySchemaType(Type type)
    {
        if (type == typeof(string))
            return new { type = "string" };

        if (type == typeof(int) || type == typeof(float) || type == typeof(double))
            return new { type = "number" };

        if (type == typeof(bool))
            return new { type = "boolean" };

        if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(List<>))
        {
            var itemType = type.GetGenericArguments()[0];
            return new
            {
                type = "array",
                items = GetPropertySchemaType(itemType)
            };
        }

        return new { type = "object" };
    }
}