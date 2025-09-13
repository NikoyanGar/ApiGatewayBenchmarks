using Ocelot.DependencyInjection;
using Ocelot.Middleware;

namespace OcelotGateway
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);
            builder.Services.AddOcelot();

            builder.Services.AddControllers();
            builder.Services.AddSwaggerGen();
            var app = builder.Build();

            // Swagger/OpenAPI (enable in Development and Docker)
            if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Docker"))
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            if (!app.Environment.IsEnvironment("Docker"))
            {
                app.UseHttpsRedirection();
            }

            app.MapControllers();

            // Place Ocelot at the end so Swagger/UI routes work
            await app.UseOcelot();

            app.Run();
        }
    }
}
