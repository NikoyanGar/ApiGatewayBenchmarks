# build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY YarpGateway/YarpGateway.csproj YarpGateway/
RUN dotnet restore YarpGateway/YarpGateway.csproj
COPY . .
WORKDIR /src/YarpGateway
RUN dotnet publish -c Release -o /app/publish

# runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8001
ENV ASPNETCORE_ENVIRONMENT=Docker
EXPOSE 8001
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "YarpGateway.dll"]