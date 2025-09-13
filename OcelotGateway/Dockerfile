# build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY OcelotGateway/OcelotGateway.csproj OcelotGateway/
RUN dotnet restore OcelotGateway/OcelotGateway.csproj
COPY . .
WORKDIR /src/OcelotGateway
RUN dotnet publish -c Release -o /app/publish

# runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8000
ENV ASPNETCORE_ENVIRONMENT=Docker
EXPOSE 8000
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "OcelotGateway.dll"]