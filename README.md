# dotNetDM

Sample full-stack data modeler built with:

- ASP.NET Core Web API on `.NET 8`
- ReactJS with Vite
- Sample provider support for SQL Server, PostgreSQL, and MongoDB

## Structure

- `backend/DataModeler.Api` - .NET 8 Web API
- `frontend` - ReactJS frontend inspired by the provided UI reference

## Run

### Backend

This workspace does not currently have the `.NET SDK` installed, so the API could not be executed here.

Once `.NET 8 SDK` is installed:

```bash
cd backend/DataModeler.Api
dotnet restore
dotnet run
```

The API is configured to serve on the usual ASP.NET Core development ports and exposes:

- `GET /api/modeler/diagram`
- `POST /api/modeler/diagram`
- `GET /api/modeler/providers`
- `POST /api/modeler/introspect`

Saved diagrams are persisted to `backend/DataModeler.Api/App_Data/diagram.json`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

If the backend is running on a different port, update `VITE_API_BASE_URL` in a local `.env` file.

## Features

- Drag and drop entity cards on the diagram canvas
- Edit entity names, physical names, comments, and attributes
- Add and delete entities and attributes
- Save and reload models through the ASP.NET Core API
- Browser `localStorage` fallback when the backend is unavailable
- Import live schema metadata from SQL Server, PostgreSQL, or MongoDB
# dotNetDM
