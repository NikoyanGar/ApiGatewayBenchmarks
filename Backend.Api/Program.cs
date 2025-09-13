using Microsoft.AspNetCore.Builder;

namespace Backend.Api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.Services.AddControllers();
            builder.Services.AddOpenApi(); // OpenAPI document
            builder.Services.AddSwaggerGen();
            var app = builder.Build();

            // Swagger/OpenAPI (enable in Development and Docker)
            if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Docker"))
            {
                app.MapOpenApi();
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // Avoid HTTPS redirect inside containers
            if (!app.Environment.IsEnvironment("Docker"))
            {
                app.UseHttpsRedirection();
            }

            app.UseAuthorization();

            app.MapControllers();

            // Simple test endpoint
            app.MapGet("/api/test", () => Results.Json(new { message = "Hello from backend" }));

            app.Run();
        }
    }
}
