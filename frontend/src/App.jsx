import { useEffect, useMemo, useRef, useState } from "react";
import LeftSidebar from "./components/LeftSidebar";
import TopTabs from "./components/TopTabs";
import DiagramCanvas from "./components/DiagramCanvas";
import RightInspector from "./components/RightInspector";
import { sampleModel } from "./data/sampleModel";

const DEFAULT_LOCAL_API_BASE_URL =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5248"
    : "https://localhost:7248";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_LOCAL_API_BASE_URL;
const LOCAL_STORAGE_KEY = "dotnetdm-model";
const PANEL_STORAGE_KEY = "dotnetdm-panel-widths";
const JSON_DRAFT_STORAGE_KEY = "dotnetdm-json-draft";
const AI_MODELER_STORAGE_KEY = "dotnetdm-ai-modeler";
const DEFAULT_LEFT_PANEL_WIDTH = 290;
const DEFAULT_RIGHT_PANEL_WIDTH = 330;
const MIN_PANEL_WIDTH = 220;
const MAX_PANEL_WIDTH = 520;
const DEFAULT_VIEWPORT = { width: 1200, height: 900 };
const DEFAULT_ZOOM = 0.82;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.1;
const CARD_BASE_WIDTH = 280;
const CARD_MIN_WIDTH = 220;
const CARD_MIN_HEIGHT = 120;
const CARD_HEADER = 50;
const ROW_HEIGHT = 38;
const PK_SEPARATOR_EXTRA_HEIGHT = 24;
const CARD_MAX_WIDTH = 560;
const DB_META_MAP = {
  postgresql: { db: "1075859235", label: "PostgreSQL", schema: "public" },
  sqlserver: { db: "1075859016", label: "SQL Server", schema: "dbo" },
  mssql: { db: "1075859016", label: "SQL Server", schema: "dbo" },
  mongodb: { db: "1075859196", label: "MongoDB", schema: "public" },
  mysql: { db: "1075859129", label: "MySQL", schema: "public" },
  mariadb: { db: "1075859190", label: "MariaDB", schema: "public" },
  oracle: { db: "1075858979", label: "Oracle", schema: "dbo" }
};
const VIEW_MODE_OPTIONS = ["Physical View", "Logical View"];
const DATABASE_OPTIONS = [
  "AlloyDB",
  "ArangoDB",
  "Avro",
  "Azure Synapse",
  "BigQuery",
  "Cassandra",
  "Couchbase",
  "Databricks",
  "Db2 for i",
  "Db2 for LUW",
  "Db2 for z/OS",
  "DynamoDB",
  "Google BigQuery",
  "Hive",
  "Informix",
  "JSON",
  "MariaDB",
  "MongoDB",
  "MS SQL Server",
  "MySQL",
  "Neo4j",
  "Netezza",
  "ODBC",
  "Oracle",
  "Parquet",
  "PostgreSQL",
  "Progress",
  "Redshift",
  "SAP ASE",
  "SAP IQ",
  "SAS",
  "Snowflake",
  "Teradata"
];
const DATABASE_VERSION_OPTIONS = {
  AlloyDB: ["1.1"],
  ArangoDB: ["3.0"],
  Avro: ["1.x"],
  "Azure Synapse": ["10.0"],
  BigQuery: ["2.0"],
  Cassandra: ["3.x", "4.x"],
  Couchbase: ["7.x"],
  Databricks: ["1.0"],
  "Db2 for i": ["5.x", "6.x", "7.x"],
  "Db2 for LUW": ["11.1", "11.5"],
  "Db2 for z/OS": ["12", "13"],
  DynamoDB: ["19.0"],
  "Google BigQuery": ["2.0"],
  Hive: ["2.1.x"],
  Informix: ["10.x", "11.x", "12.x"],
  JSON: ["1.x"],
  MariaDB: ["10.4.x"],
  MongoDB: ["6.x"],
  "MS SQL Server": ["2019", "2022", "Azure"],
  MySQL: ["8.x"],
  Neo4j: ["4.3.x", "4.4.x"],
  Netezza: ["7.2"],
  ODBC: ["3.x"],
  Oracle: ["21c"],
  Parquet: ["2.x"],
  PostgreSQL: ["16.x"],
  Progress: ["9.x", "10.x", "11.x"],
  Redshift: ["1.0"],
  "SAP ASE": ["15.x", "16"],
  "SAP IQ": ["15.x", "16"],
  SAS: ["1.0"],
  Snowflake: ["4.10"],
  Teradata: ["17.x"]
};
const DISPLAY_LEVEL_OPTIONS_PHYSICAL = [
  { value: "0", label: "Table" },
  { value: "1", label: "Column" },
  { value: "12", label: "Key" },
  { value: "13", label: "Graph" },
  { value: "3", label: "Comment" },
  { value: "5", label: "PrimaryKey" },
  { value: "6", label: "Order" },
  { value: "7", label: "Icon" }
];
const DISPLAY_LEVEL_OPTIONS_LOGICAL = [
  { value: "0", label: "Entity" },
  { value: "1", label: "Attribute" },
  { value: "12", label: "Key" },
  { value: "13", label: "Graph" },
  { value: "3", label: "Definition" },
  { value: "5", label: "PrimaryKey" },
  { value: "7", label: "Icon" }
];
const LOGICAL_NOTATION_OPTIONS = ["IDEF1x", "Information Engineering"];
const PHYSICAL_NOTATION_OPTIONS = ["IDEF1x", "Information Engineering", "Data Warehousing", "Graph"];
const AI_ENGINE_OPTIONS = ["Azure OpenAI", "OpenAI"];
const THEME_FONT_OPTIONS = [
  "Outfit",
  "Source Serif 4",
  "Inter",
  "Georgia",
  "Arial",
  "Courier New"
];
const DEFAULT_THEME_SETTINGS = {
  defaultFont: "Outfit",
  diagramFill: "#0d1520",
  entityFont: "Outfit",
  entityFill: "#202b3a",
  attributeFont: "Outfit",
  relationshipTextFont: "Outfit",
  relationshipLineColor: "#42d9d4",
  relationshipLineWidth: "2.5",
  fkColumnColor: "#8ec0ff",
  pkColumnColor: "#ffd26b"
};
const DEFAULT_THEME_ID = "default-theme";

function normalizeThemeSettings(settings) {
  return {
    ...DEFAULT_THEME_SETTINGS,
    ...(settings ?? {})
  };
}

function normalizeThemeLibrary(project) {
  const legacyThemeSettings = normalizeThemeSettings({
    ...(sampleModel.project?.theme ?? {}),
    ...(project?.theme ?? {})
  });
  const sourceThemes = Array.isArray(project?.themes) && project.themes.length > 0
    ? project.themes
    : [
        {
          id: project?.activeThemeId ?? DEFAULT_THEME_ID,
          name: "Default Theme",
          settings: legacyThemeSettings
        }
      ];
  const themes = sourceThemes.map((theme, index) => ({
    id: String(theme?.id ?? `theme-${index + 1}`),
    name: String(theme?.name ?? `Theme ${index + 1}`),
    settings: normalizeThemeSettings(theme?.settings ?? theme)
  }));
  const activeThemeId = themes.some((theme) => theme.id === project?.activeThemeId)
    ? String(project.activeThemeId)
    : themes[0]?.id ?? DEFAULT_THEME_ID;
  const activeTheme = themes.find((theme) => theme.id === activeThemeId) ?? themes[0];

  return {
    themes,
    activeThemeId,
    theme: normalizeThemeSettings(activeTheme?.settings)
  };
}
const GENERIC_TYPES = ["integer", "bigint", "numeric", "varchar", "text", "boolean", "date", "timestamp"];
const ORACLE_TYPES = [
  "number",
  "decimal",
  "numeric",
  "integer",
  "int",
  "smallint",
  "real",
  "varchar2",
  "nvarchar2",
  "char",
  "nchar",
  "float",
  "binary_float",
  "binary_double",
  "double precision",
  "date",
  "timestamp",
  "timestamp with time zone",
  "timestamp with local time zone",
  "interval year to month",
  "interval day to second",
  "clob",
  "nclob",
  "blob",
  "bfile",
  "raw",
  "long",
  "long raw",
  "rowid",
  "urowid",
  "xmltype",
  "json"
];
const PG_TYPES = [
  "smallint",
  "integer",
  "bigint",
  "decimal",
  "numeric",
  "real",
  "double precision",
  "serial",
  "bigserial",
  "money",
  "char",
  "varchar",
  "text",
  "boolean",
  "date",
  "time",
  "timestamp",
  "timestamptz",
  "interval",
  "uuid",
  "json",
  "jsonb",
  "bytea"
];
const MSSQL_TYPES = [
  "bit",
  "tinyint",
  "smallint",
  "int",
  "bigint",
  "decimal",
  "numeric",
  "money",
  "smallmoney",
  "float",
  "real",
  "char",
  "varchar",
  "text",
  "nchar",
  "nvarchar",
  "ntext",
  "binary",
  "varbinary",
  "image",
  "date",
  "time",
  "datetime",
  "datetime2",
  "datetimeoffset",
  "smalldatetime",
  "uniqueidentifier",
  "xml",
  "json"
];
const MYSQL_TYPES = [
  "tinyint",
  "smallint",
  "mediumint",
  "int",
  "bigint",
  "decimal",
  "numeric",
  "float",
  "double",
  "bit",
  "char",
  "varchar",
  "text",
  "tinytext",
  "mediumtext",
  "longtext",
  "binary",
  "varbinary",
  "blob",
  "tinyblob",
  "mediumblob",
  "longblob",
  "date",
  "time",
  "datetime",
  "timestamp",
  "year",
  "json"
];
const MONGODB_TYPES = [
  "string",
  "integer",
  "long",
  "double",
  "decimal",
  "boolean",
  "date",
  "timestamp",
  "objectId",
  "object",
  "array",
  "ArrayOfObject",
  "null",
  "regex"
];
const BIGQUERY_TYPES = [
  "string",
  "bytes",
  "integer",
  "int64",
  "float",
  "float64",
  "numeric",
  "bignumeric",
  "boolean",
  "bool",
  "date",
  "datetime",
  "time",
  "timestamp",
  "json",
  "record",
  "struct",
  "geography"
];
const HIVE_TYPES = [
  "tinyint",
  "smallint",
  "int",
  "bigint",
  "float",
  "double",
  "decimal",
  "string",
  "varchar",
  "char",
  "boolean",
  "date",
  "timestamp",
  "binary",
  "array",
  "map",
  "struct",
  "uniontype"
];
const DBX_TYPES = [
  "tinyint",
  "smallint",
  "int",
  "bigint",
  "float",
  "double",
  "decimal",
  "string",
  "varchar",
  "char",
  "boolean",
  "date",
  "timestamp",
  "binary",
  "array",
  "map",
  "struct"
];
const SNOWFLAKE_TYPES = [
  "number",
  "decimal",
  "numeric",
  "int",
  "integer",
  "bigint",
  "smallint",
  "tinyint",
  "byteint",
  "float",
  "float4",
  "float8",
  "double",
  "double precision",
  "real",
  "varchar",
  "string",
  "text",
  "char",
  "character",
  "boolean",
  "date",
  "datetime",
  "time",
  "timestamp",
  "timestamp_ltz",
  "timestamp_ntz",
  "timestamp_tz",
  "binary",
  "varbinary",
  "variant",
  "object",
  "array",
  "geography",
  "geometry"
];
const TERADATA_TYPES = [
  "byteint",
  "smallint",
  "integer",
  "bigint",
  "decimal",
  "numeric",
  "float",
  "real",
  "double precision",
  "char",
  "varchar",
  "clob",
  "blob",
  "byte",
  "varbyte",
  "date",
  "time",
  "timestamp",
  "interval year to month",
  "interval day to second",
  "json",
  "xml"
];
const REDSHIFT_TYPES = [
  "smallserial",
  "serial",
  "bigserial",
  "smallint",
  "integer",
  "bigint",
  "decimal",
  "numeric",
  "real",
  "double precision",
  "boolean",
  "char",
  "varchar",
  "text",
  "date",
  "time",
  "timetz",
  "timestamp",
  "timestamptz",
  "interval",
  "super",
  "varbyte",
  "geometry"
];
const NETEZZA_TYPES = [
  "byteint",
  "smallint",
  "integer",
  "bigint",
  "numeric",
  "decimal",
  "real",
  "double precision",
  "money",
  "char",
  "character",
  "varchar",
  "char varying",
  "nchar",
  "nvarchar",
  "boolean",
  "date",
  "time",
  "timestamp",
  "interval",
  "varbinary",
  "json"
];
const PROGRESS_TYPES = [
  "tinyint",
  "int",
  "character",
  "char",
  "varchar",
  "longvarchar",
  "smallint",
  "integer",
  "int64",
  "decimal",
  "numeric",
  "real",
  "float",
  "double precision",
  "double",
  "logical",
  "date",
  "time",
  "timestamp",
  "datetime",
  "blob",
  "clob",
  "raw"
];
const SAP_ASE_TYPES = [
  "tinyint",
  "smallint",
  "int",
  "bigint",
  "decimal",
  "numeric",
  "money",
  "smallmoney",
  "float",
  "real",
  "bit",
  "char",
  "varchar",
  "unichar",
  "univarchar",
  "text",
  "unitext",
  "binary",
  "varbinary",
  "image",
  "date",
  "time",
  "datetime",
  "smalldatetime",
  "timestamp"
];
const SAP_IQ_TYPES = [
  "bit",
  "tinyint",
  "smallint",
  "int",
  "bigint",
  "decimal",
  "numeric",
  "real",
  "double",
  "float",
  "char",
  "varchar",
  "long varchar",
  "nchar",
  "nvarchar",
  "long nvarchar",
  "binary",
  "varbinary",
  "long binary",
  "date",
  "time",
  "timestamp"
];
const INFORMIX_TYPES = [
  "smallint",
  "integer",
  "bigint",
  "int8",
  "serial",
  "serial8",
  "decimal",
  "money",
  "smallfloat",
  "float",
  "char",
  "varchar",
  "lvarchar",
  "nchar",
  "nvarchar",
  "text",
  "byte",
  "boolean",
  "date",
  "datetime",
  "interval",
  "blob",
  "clob",
  "json",
  "bson"
];
const DB2_TYPES = [
  "smallint",
  "integer",
  "bigint",
  "decimal",
  "numeric",
  "real",
  "double",
  "float",
  "char",
  "varchar",
  "long varchar",
  "graphic",
  "vargraphic",
  "boolean",
  "date",
  "time",
  "timestamp",
  "blob",
  "clob",
  "dbcblob",
  "xml",
  "json"
];
const AMAZON_KEYSPACES_TYPES = ["ascii", "bigint", "blob", "boolean", "date", "decimal", "double", "float", "inet", "int", "smallint", "text", "time", "timestamp", "timeuuid", "tinyint", "uuid", "varchar", "varint", "list", "map", "set", "tuple"];
const DYNAMODB_TYPES = ["string", "number", "binary", "boolean", "null", "list", "map", "string set", "number set", "binary set"];
const PARQUET_TYPES = ["boolean", "int32", "int64", "int96", "float", "double", "binary", "fixed_len_byte_array"];
const NEO4J_TYPES = ["string", "integer", "float", "boolean", "date", "time", "datetime", "localtime", "localdatetime", "duration", "point", "bytearray", "list", "map"];
const ARANGODB_TYPES = ["string", "integer", "double", "boolean", "null", "array", "object", "datetime"];
const CASSANDRA_TYPES = ["ascii", "bigint", "blob", "boolean", "date", "decimal", "double", "float", "inet", "int", "smallint", "text", "time", "timestamp", "timeuuid", "tinyint", "uuid", "varchar", "varint", "list", "map", "set", "tuple"];
const ODBC_TYPES = ["char", "varchar", "longvarchar", "wchar", "wvarchar", "decimal", "numeric", "smallint", "integer", "real", "float", "double", "bit", "tinyint", "bigint", "binary", "varbinary", "longvarbinary", "date", "time", "timestamp"];
const JSON_COUCHBASE_TYPES = ["string", "array", "ArrayOfObject", "object", "integer", "number", "boolean", "null"];
const DB_TYPES_BY_ENGINE = {
  alloydb: PG_TYPES,
  postgresql: PG_TYPES,
  sqlserver: MSSQL_TYPES,
  mssql: MSSQL_TYPES,
  azuresynapse: MSSQL_TYPES,
  mysql: MYSQL_TYPES,
  mariadb: MYSQL_TYPES,
  oracle: ORACLE_TYPES,
  mongodb: MONGODB_TYPES,
  bigquery: BIGQUERY_TYPES,
  hive: HIVE_TYPES,
  databricks: DBX_TYPES,
  snowflake: SNOWFLAKE_TYPES,
  teradata: TERADATA_TYPES,
  redshift: REDSHIFT_TYPES,
  netezza: NETEZZA_TYPES,
  progress: PROGRESS_TYPES,
  sapase: SAP_ASE_TYPES,
  sapiq: SAP_IQ_TYPES,
  informix: INFORMIX_TYPES,
  db2luw: DB2_TYPES,
  db2zos: DB2_TYPES,
  db2i: DB2_TYPES,
  amazonkeyspaces: AMAZON_KEYSPACES_TYPES,
  cassandra: CASSANDRA_TYPES,
  dynamodb: DYNAMODB_TYPES,
  parquet: PARQUET_TYPES,
  neo4j: NEO4J_TYPES,
  arangodb: ARANGODB_TYPES,
  odbc: ODBC_TYPES,
  json: JSON_COUCHBASE_TYPES,
  couchbase: JSON_COUCHBASE_TYPES
};

function supportsViewObjects(engineId) {
  return !["neo4j", "amazonkeyspaces", "cassandra", "dynamodb", "parquet", "json"].includes(
    String(engineId || "").toLowerCase()
  );
}

function supportsCachedViews(engineId) {
  return [
    "alloydb",
    "netezza",
    "redshift",
    "bigquery",
    "oracle",
    "azuresynapse",
    "db2luw",
    "db2zos",
    "databricks",
    "hive",
    "snowflake",
    "postgresql",
    "teradata",
    "cassandra"
  ].includes(String(engineId || "").toLowerCase());
}

function getDisplayLevelOptionsForViewMode(viewMode) {
  return viewMode === "Logical View"
    ? DISPLAY_LEVEL_OPTIONS_LOGICAL
    : DISPLAY_LEVEL_OPTIONS_PHYSICAL;
}

function getDefaultDisplayLevelForViewMode(viewMode) {
  return "1";
}

function getDisplayLevelValueForViewMode(viewMode, valueOrLabel) {
  const normalizedValue = String(valueOrLabel ?? "").trim();
  const options = getDisplayLevelOptionsForViewMode(viewMode);
  const matchByValue = options.find((option) => option.value === normalizedValue);

  if (matchByValue) {
    return matchByValue.value;
  }

  const normalizedLabel = normalizedValue.toLowerCase();
  const matchByLabel = options.find((option) => option.label.toLowerCase() === normalizedLabel);
  return matchByLabel?.value ?? getDefaultDisplayLevelForViewMode(viewMode);
}

function getDiagramDisplayLevelValue(diagram, viewMode) {
  return viewMode === "Logical View"
    ? String(diagram?.displayLevelLogical ?? "1")
    : String(diagram?.displayLevelPhysical ?? "1");
}

function getDatatypeOptionsForEngine(engine) {
  return DB_TYPES_BY_ENGINE[engine] ?? GENERIC_TYPES;
}

function syncProjectWithActiveDiagram(modelLike, nextProject = modelLike.project, nextActiveDiagramId = modelLike.activeDiagramId) {
  const activeDiagram =
    modelLike.diagrams.find((diagram) => diagram.id === nextActiveDiagramId) ?? modelLike.diagrams[0];

  return {
    ...modelLike,
    activeDiagramId: nextActiveDiagramId,
    project: {
      ...nextProject,
      diagramDefinition: activeDiagram?.definition ?? "",
      displayLevel: getDisplayLevelValueForViewMode(nextProject.viewMode, getDiagramDisplayLevelValue(activeDiagram, nextProject.viewMode))
    }
  };
}

function mergeProjectDefaults(project) {
  const normalizedThemes = normalizeThemeLibrary(project);
  return {
    ...sampleModel.project,
    ...(project ?? {}),
    ...normalizedThemes
  };
}

function toRgba(hex, alpha) {
  const normalized = String(hex ?? "").trim().replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  if (!/^[\da-fA-F]{6}$/.test(expanded)) {
    return `rgba(255,255,255,${alpha})`;
  }

  const red = parseInt(expanded.slice(0, 2), 16);
  const green = parseInt(expanded.slice(2, 4), 16);
  const blue = parseInt(expanded.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 9h9v9H9z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h11l3 3v13H5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 4h7v5H8z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 15h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h5l2 2h9v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 9V7a2 2 0 0 1 2-2h3l2 2h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function JsonActionButton({ label, onClick, children }) {
  return (
    <div className="tooltip-shell">
      <button type="button" className="icon-button json-action-button" onClick={onClick} aria-label={label} title={label}>
        {children}
      </button>
      <span className="tooltip-bubble">{label}</span>
    </div>
  );
}

function readLocalModel() {
  try {
    const localValue = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return localValue ? JSON.parse(localValue) : null;
  } catch {
    return null;
  }
}

function readPanelWidths() {
  try {
    const localValue = window.localStorage.getItem(PANEL_STORAGE_KEY);
    if (!localValue) {
      return null;
    }

    const parsed = JSON.parse(localValue);
    return {
      left: parsed.left ?? DEFAULT_LEFT_PANEL_WIDTH,
      right: parsed.right ?? DEFAULT_RIGHT_PANEL_WIDTH
    };
  } catch {
    return null;
  }
}

function readJsonDraft() {
  try {
    return window.localStorage.getItem(JSON_DRAFT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function readAiModelerSettings() {
  try {
    const localValue = window.localStorage.getItem(AI_MODELER_STORAGE_KEY);
    if (!localValue) {
      return null;
    }

    return JSON.parse(localValue);
  } catch {
    return null;
  }
}

function createDefaultAiModelerSettings() {
  return {
    engine: "Azure OpenAI",
    schemaDescription: "",
    endpoint: "https://dm-ai-api.openai.azure.com",
    apiKey: "",
    apiVersion: "2024-08-01-preview",
    deployment: "gpt-4o",
    azureOpenAi: {
      endpoint: "https://dm-ai-api.openai.azure.com",
      apiKey: "",
      apiVersion: "2024-08-01-preview",
      deployment: "gpt-4o",
      validationMessage: "",
      validationStatus: "idle"
    },
    openAi: {
      apiKey: "",
      deployment: "gpt-4o",
      validationMessage: "",
      validationStatus: "idle"
    },
    isKeyVisible: false,
    isValidating: false,
    validationMessage: "",
    validationStatus: "idle"
  };
}

function normalizeAiModelerSettings(settings) {
  const normalized = {
    ...createDefaultAiModelerSettings(),
    ...(settings ?? {})
  };

  const azureOpenAi = {
    ...createDefaultAiModelerSettings().azureOpenAi,
    ...(normalized.azureOpenAi ?? {}),
    endpoint:
      normalized.azureOpenAi?.endpoint ||
      (normalized.engine === "Azure OpenAI" ? normalized.endpoint : "") ||
      "https://dm-ai-api.openai.azure.com",
    apiKey:
      normalized.azureOpenAi?.apiKey ||
      (normalized.engine === "Azure OpenAI" ? normalized.apiKey : "") ||
      "",
    apiVersion:
      normalized.azureOpenAi?.apiVersion ||
      (normalized.engine === "Azure OpenAI" ? normalized.apiVersion : "") ||
      "2024-08-01-preview",
    deployment:
      normalized.azureOpenAi?.deployment ||
      (normalized.engine === "Azure OpenAI" ? normalized.deployment : "") ||
      "gpt-4o",
    validationMessage:
      normalized.azureOpenAi?.validationMessage ||
      (normalized.engine === "Azure OpenAI" ? normalized.validationMessage : "") ||
      "",
    validationStatus:
      normalized.azureOpenAi?.validationStatus ||
      (normalized.engine === "Azure OpenAI" ? normalized.validationStatus : "") ||
      "idle"
  };

  const openAi = {
    ...createDefaultAiModelerSettings().openAi,
    ...(normalized.openAi ?? {}),
    apiKey:
      normalized.openAi?.apiKey ||
      (normalized.engine === "OpenAI" ? normalized.apiKey : "") ||
      "",
    deployment:
      normalized.openAi?.deployment ||
      (normalized.engine === "OpenAI" ? normalized.deployment : "") ||
      "gpt-4o",
    validationMessage:
      normalized.openAi?.validationMessage ||
      (normalized.engine === "OpenAI" ? normalized.validationMessage : "") ||
      "",
    validationStatus:
      normalized.openAi?.validationStatus ||
      (normalized.engine === "OpenAI" ? normalized.validationStatus : "") ||
      "idle"
  };

  if (normalized.engine === "OpenAI") {
    return {
      ...normalized,
      azureOpenAi,
      openAi,
      endpoint: "https://api.openai.com/v1",
      apiKey: openAi.apiKey,
      apiVersion: "",
      deployment: openAi.deployment || "gpt-4o",
      validationMessage: openAi.validationMessage,
      validationStatus: openAi.validationStatus
    };
  }

  return {
    ...normalized,
    azureOpenAi,
    openAi,
    endpoint: azureOpenAi.endpoint || "https://dm-ai-api.openai.azure.com",
    apiKey: azureOpenAi.apiKey,
    apiVersion: azureOpenAi.apiVersion || "2024-08-01-preview",
    deployment: azureOpenAi.deployment || "gpt-4o",
    validationMessage: azureOpenAi.validationMessage,
    validationStatus: azureOpenAi.validationStatus
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toIdMap(items) {
  return new Map(items.map((item) => [String(item.id), item]));
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeDbEngine(databaseName) {
  const normalized = String(databaseName ?? "").trim().toLowerCase();
  if (normalized.includes("bigquery")) {
    return "bigquery";
  }
  if (normalized.includes("alloy")) {
    return "alloydb";
  }
  if (normalized.includes("arangodb")) {
    return "arangodb";
  }
  if (normalized.includes("avro")) {
    return "avro";
  }
  if (normalized.includes("synapse")) {
    return "azuresynapse";
  }
  if (normalized.includes("cassandra")) {
    return "cassandra";
  }
  if (normalized.includes("couch")) {
    return "couchbase";
  }
  if (normalized.includes("databricks")) {
    return "databricks";
  }
  if (normalized.includes("db2 for i")) {
    return "db2i";
  }
  if (normalized.includes("db2 for luw")) {
    return "db2luw";
  }
  if (normalized.includes("db2 for z")) {
    return "db2zos";
  }
  if (normalized.includes("dynamo")) {
    return "dynamodb";
  }
  if (normalized.includes("hive")) {
    return "hive";
  }
  if (normalized.includes("informix")) {
    return "informix";
  }
  if (normalized === "json") {
    return "json";
  }
  if (normalized.includes("postgres")) {
    return "postgresql";
  }
  if (normalized.includes("sql server") || normalized === "mssql" || normalized.includes("ms sql")) {
    return "sqlserver";
  }
  if (normalized.includes("mongo")) {
    return "mongodb";
  }
  if (normalized.includes("maria")) {
    return "mariadb";
  }
  if (normalized.includes("mysql")) {
    return "mysql";
  }
  if (normalized.includes("neo4j")) {
    return "neo4j";
  }
  if (normalized.includes("netezza")) {
    return "netezza";
  }
  if (normalized.includes("odbc")) {
    return "odbc";
  }
  if (normalized.includes("oracle")) {
    return "oracle";
  }
  if (normalized.includes("parquet")) {
    return "parquet";
  }
  if (normalized.includes("progress")) {
    return "progress";
  }
  if (normalized.includes("redshift")) {
    return "redshift";
  }
  if (normalized.includes("sap ase")) {
    return "sapase";
  }
  if (normalized.includes("sap iq")) {
    return "sapiq";
  }
  if (normalized === "sas") {
    return "sas";
  }
  if (normalized.includes("snowflake")) {
    return "snowflake";
  }
  if (normalized.includes("teradata")) {
    return "teradata";
  }
  return normalized || "postgresql";
}

function getReverseEngineeringLabels(provider) {
  const normalized = normalizeDbEngine(provider);

  if (normalized === "sqlserver" || normalized === "postgresql") {
    return {
      databaseObjectLabel: "tables",
      databaseObjectSingular: "table",
      itemStepTitle: "Tables",
      itemAvailableTitle: "Available Tables",
      itemSelectedTitle: "Selected Tables",
      itemCountLabel: "columns"
    };
  }

  return {
    databaseObjectLabel: "collections",
    databaseObjectSingular: "collection",
    itemStepTitle: "Collections",
    itemAvailableTitle: "Available Collections",
    itemSelectedTitle: "Selected Collections",
    itemCountLabel: "documents"
  };
}

function buildReverseEngineeringConnectionString(provider, reverseEngineering) {
  const normalized = normalizeDbEngine(provider);

  if (normalized === "sqlserver") {
    const server = String(reverseEngineering.server ?? "").trim();
    const database = String(reverseEngineering.databaseNameInput ?? "").trim() || "master";
    const userName = String(reverseEngineering.userName ?? "").trim();
    const password = String(reverseEngineering.password ?? "");
    const encrypt = Boolean(reverseEngineering.useEncryptedConnection);

    return [
      `Server=${server}`,
      `Database=${database}`,
      `User Id=${userName}`,
      `Password=${password}`,
      `TrustServerCertificate=True`,
      `Encrypt=${encrypt ? "True" : "False"}`
    ].join(";");
  }

  if (normalized === "postgresql") {
    const server = String(reverseEngineering.server ?? "").trim();
    const port = String(reverseEngineering.port ?? "").trim() || "5432";
    const database = String(reverseEngineering.databaseNameInput ?? "").trim() || "postgres";
    const userName = String(reverseEngineering.userName ?? "").trim();
    const password = String(reverseEngineering.password ?? "");
    const encrypt = Boolean(reverseEngineering.useEncryptedConnection);

    return [
      `Host=${server}`,
      `Port=${port}`,
      `Database=${database}`,
      `Username=${userName}`,
      `Password=${password}`,
      `SSL Mode=${encrypt ? "Require" : "Disable"}`,
      `Trust Server Certificate=True`
    ].join(";");
  }

  return String(reverseEngineering.connectionString ?? "").trim();
}

function isDocumentDatabase(databaseName) {
  return ["mongodb", "couchbase", "json"].includes(normalizeDbEngine(databaseName));
}

function collectNestedFieldNamesFromAttributes(attributes) {
  const names = new Set();

  function visit(items) {
    (items ?? []).forEach((attribute) => {
      const children = Array.isArray(attribute?.children) ? attribute.children : [];
      if (children.length > 0) {
        if (attribute?.name) {
          names.add(String(attribute.name));
        }
        if (attribute?.physicalName) {
          names.add(String(attribute.physicalName));
        }
      }
      children.forEach((child) => {
        if (child?.name) {
          names.add(String(child.name));
        }
        if (child?.physicalName) {
          names.add(String(child.physicalName));
        }
      });
      visit(children);
    });
  }

  visit(attributes);
  return names;
}

function resolveDbMeta(databaseName, databaseVersion) {
  const engine = normalizeDbEngine(databaseName);
  const resolved = DB_META_MAP[engine] ?? DB_META_MAP.postgresql;
  const version = String(databaseVersion ?? "").trim();
  const [major = "1", minor = "0"] = version.split(/[^\d]+/).filter(Boolean);

  return {
    engine,
    db: resolved.db,
    label: resolved.label,
    schema: resolved.schema,
    major,
    minor
  };
}

function resolveDbMetaFromPayloadMeta(meta) {
  const dbId = String(meta?.db ?? "").trim();
  const dbEngine = String(meta?.dbEngine ?? "").trim();

  if (dbEngine) {
    return resolveDbMeta(
      DB_META_MAP[normalizeDbEngine(dbEngine)]?.label ?? dbEngine,
      `${meta?.dbMajorVersion ?? "1"}${meta?.dbMinorVersion != null ? `.${meta.dbMinorVersion}` : ""}`
    );
  }

  if (dbId) {
    const matchingEntry = Object.values(DB_META_MAP).find((item) => String(item.db) === dbId);
    if (matchingEntry) {
      return resolveDbMeta(
        matchingEntry.label,
        `${meta?.dbMajorVersion ?? "1"}${meta?.dbMinorVersion != null ? `.${meta.dbMinorVersion}` : ""}`
      );
    }
  }

  return resolveDbMeta(
    "PostgreSQL",
    `${meta?.dbMajorVersion ?? "16"}${meta?.dbMinorVersion != null ? `.${meta.dbMinorVersion}` : ""}`
  );
}

function getRelationshipName(relationship, source, target) {
  return relationship.name ?? `${source?.physicalName ?? source?.name ?? "Entity"} -> ${target?.physicalName ?? target?.name ?? "Entity"}`;
}

function normalizeDatatypeCase(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isViewLikeEntity(entity) {
  return entity?.objectType === "view" || entity?.objectType === "materializedView";
}

function isAnnotationEntity(entity) {
  return entity?.objectType === "annotation";
}

function isDrawingEntity(entity) {
  return entity?.objectType === "drawing";
}

function isDrawingLineEntity(entity) {
  return entity?.objectType === "drawing" && entity?.drawingShape === "line";
}

const DRAWING_SHAPE_TYPE_MAP = {
  rectangle: "0",
  rounded: "1",
  ellipse: "2",
  pentagon: "3",
  hexagon: "4",
  octagon: "6",
  "triangle-up": "7",
  "triangle-down": "8",
  "triangle-left": "9",
  "triangle-right": "10",
  diamond: "11",
  parallelogram: "12",
  star: "13",
  cross: "14",
  line: "15"
};

const DRAWING_SHAPE_TYPE_REVERSE_MAP = Object.fromEntries(
  Object.entries(DRAWING_SHAPE_TYPE_MAP).map(([shape, value]) => [value, shape])
);

function drawingShapeToTypeValue(shape) {
  return DRAWING_SHAPE_TYPE_MAP[String(shape ?? "rectangle").trim()] ?? "0";
}

function drawingTypeValueToShape(value) {
  return DRAWING_SHAPE_TYPE_REVERSE_MAP[String(value ?? "0").trim()] ?? "rectangle";
}

function normalizeRelationshipType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "connector") {
    return "Connector";
  }

  if (
    normalized === "9" ||
    normalized === "subtype" ||
    normalized === "sub-category" ||
    normalized === "subcategory" ||
    normalized === "sub category"
  ) {
    return "Subtype";
  }

  if (normalized === "4" || normalized === "manytomany" || normalized === "many-to-many" || normalized === "many to many") {
    return "ManyToMany";
  }

  if (normalized === "16" || normalized === "derived") {
    return "Derived";
  }

  if (normalized === "7" || normalized === "non-identifying") {
    return "Non-Identifying";
  }

  if (normalized === "2" || normalized === "identifying") {
    return "Identifying";
  }

  return "Non-Identifying";
}

function relationshipTypeToValue(value) {
  const normalized = normalizeRelationshipType(value);

  if (normalized === "Connector") {
    return "Connector";
  }

  if (normalized === "Subtype") {
    return "9";
  }

  if (normalized === "ManyToMany") {
    return "4";
  }

  if (normalized === "Derived") {
    return "16";
  }

  if (normalized === "Identifying") {
    return "2";
  }

  return normalized === "Connector" ? "Connector" : "7";
}

function getEntityObjectType(entity) {
  if (entity?.objectType === "drawing") {
    return "drawing";
  }

  if (entity?.objectType === "annotation") {
    return "annotation";
  }

  if (entity?.objectType === "materializedView") {
    return "materializedView";
  }

  if (entity?.objectType === "view") {
    return "view";
  }

  return "entity";
}

function deserializeAttributeToField(attribute, fallbackPrefix = "field", index = 0) {
  const children = Array.isArray(attribute?.children) ? attribute.children : [];

  return {
    id: String(attribute?.id ?? `${fallbackPrefix}-${index + 1}`),
    kind: attribute?.isPrimary ? "PK" : attribute?.isFK ? "FK" : "COL",
    name: attribute?.name ?? `Column${index + 1}`,
    physicalName: attribute?.physicalName ?? "",
    definition: attribute?.definition ?? "",
    comment: attribute?.comment ?? "",
    isPrimary: attribute?.isPrimary ?? false,
    isFK: attribute?.isFK ?? false,
    isNullable: attribute?.isNullable ?? true,
    physicalOnly: attribute?.physicalOnly ?? false,
    logicalOnly: attribute?.logicalOnly ?? false,
    dataType: normalizeDatatypeCase(attribute?.datatype ?? attribute?.dataType ?? "varchar(50)"),
    children: children.map((child, childIndex) =>
      deserializeAttributeToField(child, `${attribute?.id ?? fallbackPrefix}-child`, childIndex)
    )
  };
}

function serializeFieldToAttribute(field) {
  const children = Array.isArray(field?.children) ? field.children : [];

  return {
    id: String(field.id),
    name: field.name ?? "",
    physicalName: field.physicalName ?? "",
    definition: field.definition ?? "",
    datatype: normalizeDatatypeCase(field.dataType ?? ""),
    comment: field.comment ?? "",
    isPrimary: field.isPrimary ?? field.kind === "PK",
    isFK: field.isFK ?? field.kind === "FK",
    isNullable: field.isNullable ?? true,
    physicalOnly: field.physicalOnly ?? false,
    logicalOnly: field.logicalOnly ?? false,
    ...(children.length > 0
      ? {
          children: children.map(serializeFieldToAttribute)
        }
      : {})
  };
}

function findFieldById(fields, fieldId) {
  for (const field of fields ?? []) {
    if (field.id === fieldId) {
      return field;
    }

    const childMatch = findFieldById(field.children ?? [], fieldId);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

function collectFieldIds(fields) {
  return (fields ?? []).flatMap((field) => [field.id, ...collectFieldIds(field.children ?? [])]);
}

function mapFieldTree(fields, updater) {
  return (fields ?? []).map((field) => {
    const nextField = {
      ...field,
      children: mapFieldTree(field.children ?? [], updater)
    };

    return updater(nextField);
  });
}

function deleteFieldFromTree(fields, fieldId) {
  return (fields ?? []).flatMap((field) => {
    if (field.id === fieldId) {
      return [];
    }

    return [
      {
        ...field,
        children: deleteFieldFromTree(field.children ?? [], fieldId)
      }
    ];
  });
}

function moveFieldInTree(fields, fieldId, direction) {
  const index = (fields ?? []).findIndex((field) => field.id === fieldId);

  if (index !== -1) {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) {
      return fields;
    }

    const nextFields = [...fields];
    const [movedField] = nextFields.splice(index, 1);
    nextFields.splice(targetIndex, 0, movedField);
    return nextFields;
  }

  return (fields ?? []).map((field) => ({
    ...field,
    children: moveFieldInTree(field.children ?? [], fieldId, direction)
  }));
}

function moveTopLevelFieldToTarget(fields, draggedFieldId, targetFieldId, targetKind) {
  const nextFields = [...(fields ?? [])];
  const draggedIndex = nextFields.findIndex((field) => field.id === draggedFieldId);
  const targetIndex = nextFields.findIndex((field) => field.id === targetFieldId);

  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
    return fields;
  }

  const [draggedField] = nextFields.splice(draggedIndex, 1);
  const normalizedTargetKind = targetKind === "PK" ? "PK" : "COL";
  const nextDraggedField = {
    ...draggedField,
    kind: normalizedTargetKind,
    isPrimary: normalizedTargetKind === "PK",
    isFK: normalizedTargetKind === "PK" ? false : draggedField.isFK ?? draggedField.kind === "FK"
  };

  const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
  nextFields.splice(adjustedTargetIndex, 0, nextDraggedField);
  return nextFields;
}

function moveTopLevelFieldToSeparator(fields, draggedFieldId, separatorFieldId) {
  const nextFields = [...(fields ?? [])];
  const draggedIndex = nextFields.findIndex((field) => field.id === draggedFieldId);
  const separatorIndex = nextFields.findIndex((field) => field.id === separatorFieldId);

  if (draggedIndex === -1 || separatorIndex === -1) {
    return fields;
  }

  const draggedField = nextFields[draggedIndex];
  const shouldPromoteToPrimary = draggedField?.kind !== "PK";
  const [removedField] = nextFields.splice(draggedIndex, 1);
  const adjustedSeparatorIndex = draggedIndex < separatorIndex ? separatorIndex - 1 : separatorIndex;
  const nextField = {
    ...removedField,
    kind: shouldPromoteToPrimary ? "PK" : "COL",
    isPrimary: shouldPromoteToPrimary,
    isFK: shouldPromoteToPrimary ? false : removedField.isFK ?? removedField.kind === "FK"
  };

  nextFields.splice(adjustedSeparatorIndex, 0, nextField);
  return nextFields;
}

function moveTopLevelFieldToGroupEdge(fields, draggedFieldId, targetKind) {
  const nextFields = [...(fields ?? [])];
  const draggedIndex = nextFields.findIndex((field) => field.id === draggedFieldId);

  if (draggedIndex === -1) {
    return fields;
  }

  const normalizedTargetKind = targetKind === "PK" ? "PK" : "COL";
  const [removedField] = nextFields.splice(draggedIndex, 1);
  const nextField = {
    ...removedField,
    kind: normalizedTargetKind,
    isPrimary: normalizedTargetKind === "PK",
    isFK: normalizedTargetKind === "PK" ? false : removedField.isFK ?? removedField.kind === "FK"
  };

  if (normalizedTargetKind === "PK") {
    const firstNonPrimaryIndex = nextFields.findIndex((field) => field.kind !== "PK");
    const insertIndex = firstNonPrimaryIndex === -1 ? nextFields.length : firstNonPrimaryIndex;
    nextFields.splice(insertIndex, 0, nextField);
    return nextFields;
  }

  const lastPrimaryIndex = nextFields.reduce(
    (foundIndex, field, index) => (field.kind === "PK" ? index : foundIndex),
    -1
  );
  const insertIndex = lastPrimaryIndex + 1;
  nextFields.splice(insertIndex, 0, nextField);
  return nextFields;
}

function addChildFieldToTree(fields, parentFieldId, childFieldFactory) {
  let inserted = false;

  const nextFields = (fields ?? []).map((field) => {
    if (field.id === parentFieldId) {
      inserted = true;
      const nextChildren = [...(field.children ?? []), childFieldFactory(field)];
      return {
        ...field,
        children: nextChildren
      };
    }

    const nextChildren = addChildFieldToTree(field.children ?? [], parentFieldId, childFieldFactory);
    if (nextChildren !== (field.children ?? [])) {
      return {
        ...field,
        children: nextChildren
      };
    }

    return field;
  });

  return inserted ? nextFields : fields;
}

function collectNumericIdsFromFields(fields, bucket) {
  (fields ?? []).forEach((field) => {
    if (/^\d+$/.test(String(field?.id ?? ""))) {
      bucket.push(Number(field.id));
    }
    collectNumericIdsFromFields(field.children ?? [], bucket);
  });
}

function getNextNumericWorkspaceId(model) {
  const numericIds = [];

  (model?.project?.schemas ?? []).forEach((schema) => {
    if (/^\d+$/.test(String(schema?.id ?? ""))) {
      numericIds.push(Number(schema.id));
    }
  });

  (model?.diagrams ?? []).forEach((diagram) => {
    if (/^\d+$/.test(String(diagram?.id ?? ""))) {
      numericIds.push(Number(diagram.id));
    }

    (diagram.entities ?? []).forEach((entity) => {
      if (/^\d+$/.test(String(entity?.id ?? ""))) {
        numericIds.push(Number(entity.id));
      }
      collectNumericIdsFromFields(entity.fields ?? [], numericIds);
    });

    (diagram.relationships ?? []).forEach((relationship) => {
      if (/^\d+$/.test(String(relationship?.id ?? ""))) {
        numericIds.push(Number(relationship.id));
      }
    });
  });

  return String((numericIds.length > 0 ? Math.max(...numericIds) : 0) + 1);
}

function getNextNumericWorkspaceIds(model, count) {
  const numericIds = [];

  (model?.project?.schemas ?? []).forEach((schema) => {
    if (/^\d+$/.test(String(schema?.id ?? ""))) {
      numericIds.push(Number(schema.id));
    }
  });

  (model?.diagrams ?? []).forEach((diagram) => {
    if (/^\d+$/.test(String(diagram?.id ?? ""))) {
      numericIds.push(Number(diagram.id));
    }

    (diagram.entities ?? []).forEach((entity) => {
      if (/^\d+$/.test(String(entity?.id ?? ""))) {
        numericIds.push(Number(entity.id));
      }
      collectNumericIdsFromFields(entity.fields ?? [], numericIds);
    });

    (diagram.relationships ?? []).forEach((relationship) => {
      if (/^\d+$/.test(String(relationship?.id ?? ""))) {
        numericIds.push(Number(relationship.id));
      }
    });
  });

  const start = (numericIds.length > 0 ? Math.max(...numericIds) : 0) + 1;
  return Array.from({ length: count }, (_, index) => String(start + index));
}

function exportModelToWorkspaceJson(model) {
  const dbMeta = resolveDbMeta(model.project?.database, model.project?.databaseVersion);
  const activeSubjectAreaId = "1";
  const allEntities = [];
  const allViews = [];
  const allCachedViews = [];
  const entityIds = new Set();
  const allRelationships = [];
  const relationshipIds = new Set();

  model.diagrams.forEach((diagram) => {
    diagram.entities.forEach((entity) => {
      if (entityIds.has(entity.id)) {
        return;
      }

      entityIds.add(entity.id);
      const serializedEntity = {
        id: String(entity.id),
        name: entity.name ?? entity.physicalName ?? "Entity",
        physicalName: entity.physicalName ?? "",
        definition: entity.definition ?? "",
        comment: entity.comment ?? "",
        physicalOnly: Boolean(entity.physicalOnly),
        logicalOnly: Boolean(entity.logicalOnly),
        indexes: entity.indexes ?? [],
        attributes: (entity.fields ?? []).map(serializeFieldToAttribute),
        props: {
          pParentRelationshipsRef: [],
          pChildRelationshipsRef: []
        }
      };

      const objectType = getEntityObjectType(entity);
      if (objectType === "drawing") {
        return;
      }

      if (objectType === "annotation") {
        return;
      }

      if (objectType === "view") {
        allViews.push({
          ...serializedEntity,
          indexes: undefined,
          props: {
            pChildRelationshipsRef: []
          }
        });
        return;
      }

      if (objectType === "materializedView") {
        allCachedViews.push({
          ...serializedEntity,
          indexes: undefined,
          props: {
            pChildRelationshipsRef: []
          }
        });
        return;
      }

      allEntities.push(serializedEntity);
    });

    diagram.relationships.forEach((relationship) => {
      if (relationshipIds.has(relationship.id)) {
        return;
      }

      relationshipIds.add(relationship.id);
      allRelationships.push({
        id: String(relationship.id),
        name: relationship.name ?? relationship.physicalName ?? relationship.id,
        physicalName: relationship.physicalName ?? relationship.id,
        definition: relationship.definition ?? "",
        comment: relationship.comment ?? "",
        description: relationship.description ?? "relates_to",
        parent: String(relationship.sourceEntityId),
        child: String(relationship.targetEntityId),
        parentAttribute: relationship.parentAttribute ?? "Entity header",
        childAttribute: relationship.childAttribute ?? "Entity header",
        cardinality: relationship.cardinality ?? "1:N",
        relationshipType: relationshipTypeToValue(relationship.relationshipType),
        physicalOnly: Boolean(relationship.physicalOnly),
        logicalOnly: Boolean(relationship.logicalOnly),
        props: {
          ...(relationship.props ?? {})
        },
        parentToChildVerbPhrase: relationship.parentToChildVerbPhrase ?? "",
        childToParentVerbPhrase: relationship.childToParentVerbPhrase ?? ""
      });
    });
  });

  const relationshipRefsByEntityId = new Map(
    [...allEntities, ...allViews, ...allCachedViews].map((entity) => [String(entity.id), { parents: [], children: [] }])
  );

  allRelationships.forEach((relationship) => {
    relationshipRefsByEntityId.get(String(relationship.parent))?.children.push(String(relationship.id));
    relationshipRefsByEntityId.get(String(relationship.child))?.parents.push(String(relationship.id));
  });

  [...allEntities, ...allViews, ...allCachedViews].forEach((entity) => {
    const refs = relationshipRefsByEntityId.get(String(entity.id));
    const objectType = allEntities.includes(entity) ? "entity" : "view";
    entity.props = objectType === "entity"
      ? {
          pParentRelationshipsRef: refs?.parents ?? [],
          pChildRelationshipsRef: refs?.children ?? []
        }
      : {
          pChildRelationshipsRef: refs?.children ?? []
        };
  });

  const workspace = {
    entities: allEntities,
    views: allViews,
    cachedViews: allCachedViews,
    relationships: allRelationships,
    schemas: (model.project?.schemas?.length > 0
      ? model.project.schemas
      : [
          {
            id: "schema-1",
            name: dbMeta.schema,
            comment: ""
          }
        ]).map((schema) => ({
          id: String(schema.id),
          name: schema.name ?? dbMeta.schema,
          comment: schema.comment ?? ""
        })),
    themes: (model.project?.themes?.length > 0
      ? model.project.themes
      : [
          {
            id: model.project?.activeThemeId ?? DEFAULT_THEME_ID,
            name: "Default Theme",
            settings: normalizeThemeSettings(model.project?.theme)
          }
        ]).map((theme) => ({
          id: String(theme.id),
          name: String(theme.name ?? "Theme"),
          isActive: String(theme.id) === String(model.project?.activeThemeId ?? DEFAULT_THEME_ID),
          settings: normalizeThemeSettings(theme.settings)
        })),
    databases: [],
    catalogs: [],
    subjectAreas: [
      {
        id: activeSubjectAreaId,
        name: model.project?.subjectArea ?? "<model>",
        locked: true,
        diagrams: model.diagrams.map((diagram) => ({
          id: String(diagram.id),
          name: diagram.name,
          definition: diagram.definition ?? model.project?.diagramDefinition ?? "",
          displayLevelLogical: String(
            diagram.displayLevelLogical ??
              getDisplayLevelValueForViewMode("Logical View", getDefaultDisplayLevelForViewMode("Logical View"))
          ),
          displayLevelPhysical: String(
            diagram.displayLevelPhysical ??
              getDisplayLevelValueForViewMode("Physical View", getDefaultDisplayLevelForViewMode("Physical View"))
          ),
          modelShapes: {
            entities: diagram.entities
              .filter((entity) => getEntityObjectType(entity) === "entity")
              .map((entity) => ({
                id: String(entity.id),
                name: entity.name ?? entity.physicalName ?? "Entity",
                physicalName: entity.physicalName ?? "",
                displayLevelLogical: "-1",
                displayLevelPhysical: "-1",
                x: entity.x ?? 160,
                y: entity.y ?? 120,
                width: entity.width ?? 0,
                height: entity.height ?? 0
              })),
            views: diagram.entities
              .filter((entity) => getEntityObjectType(entity) === "view")
              .map((entity) => ({
              id: String(entity.id),
              name: entity.name ?? entity.physicalName ?? "Entity",
              physicalName: entity.physicalName ?? "",
              displayLevelLogical: "-1",
              displayLevelPhysical: "-1",
              x: entity.x ?? 160,
              y: entity.y ?? 120,
              width: entity.width ?? 0,
              height: entity.height ?? 0
            })),
            cachedViews: diagram.entities
              .filter((entity) => getEntityObjectType(entity) === "materializedView")
              .map((entity) => ({
                id: String(entity.id),
                name: entity.name ?? entity.physicalName ?? "Entity",
                physicalName: entity.physicalName ?? "",
                displayLevelLogical: "-1",
                displayLevelPhysical: "-1",
                x: entity.x ?? 160,
                y: entity.y ?? 120,
                width: entity.width ?? 0,
                height: entity.height ?? 0
              })),
            relationships: diagram.relationships.map((relationship) => ({
              id: String(relationship.id),
              name: relationship.name ?? relationship.physicalName ?? relationship.id,
              physicalName: relationship.physicalName ?? relationship.id,
              lineOffsetX: Number(relationship?.props?.lineOffsetX ?? 0),
              lineOffsetY: Number(relationship?.props?.lineOffsetY ?? 0),
              bendPoints: Array.isArray(relationship?.props?.bendPoints)
                ? relationship.props.bendPoints
                    .map((point) => ({
                      x: Number(point?.x),
                      y: Number(point?.y)
                    }))
                    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
                : []
            })),
            Shapes: diagram.entities
              .filter((entity) => getEntityObjectType(entity) === "drawing")
              .map((entity) => {
                const baseShape = {
                  id: String(entity.id),
                  name: entity.name ?? entity.physicalName ?? `shape_${entity.id}`,
                  physicalOnly: Boolean(entity.physicalOnly),
                  text: entity.drawingText ?? "Drawing",
                  definition: entity.definition ?? "",
                  shape_type: drawingShapeToTypeValue(entity.drawingShape),
                  x: Number(entity.x ?? 100),
                  y: Number(entity.y ?? 0),
                  width: Number(entity.width ?? getPreferredEntitySize(entity).width),
                  height: Number(entity.height ?? getPreferredEntitySize(entity).height)
                };

                if (isDrawingLineEntity(entity)) {
                  return {
                    ...baseShape,
                    parent: String(entity.lineSourceId ?? ""),
                    child: String(entity.lineTargetId ?? ""),
                    lineOffsetX: Number(entity.lineOffsetX ?? 0),
                    lineOffsetY: Number(entity.lineOffsetY ?? 0),
                    lineBendPoints: Array.isArray(entity.lineBendPoints)
                      ? entity.lineBendPoints
                          .map((point) => ({
                            x: Number(point?.x),
                            y: Number(point?.y)
                          }))
                          .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
                      : [],
                    lineSourceAttachment: entity.lineSourceAttachment
                      ? {
                          side: String(entity.lineSourceAttachment.side ?? ""),
                          t: Number(entity.lineSourceAttachment.t ?? 0.5)
                        }
                      : undefined,
                    lineTargetAttachment: entity.lineTargetAttachment
                      ? {
                          side: String(entity.lineTargetAttachment.side ?? ""),
                          t: Number(entity.lineTargetAttachment.t ?? 0.5)
                        }
                      : undefined
                  };
                }

                return baseShape;
              }),
            Annotations: diagram.entities
              .filter((entity) => getEntityObjectType(entity) === "annotation")
              .map((entity) => ({
                id: String(entity.id),
                name: entity.name ?? entity.physicalName ?? `annotation_${entity.id}`,
                physicalOnly: Boolean(entity.physicalOnly),
                text: entity.annotationText ?? "Annotation",
                definition: entity.definition ?? "",
                shape_type: drawingShapeToTypeValue(entity.annotationShape ?? "rectangle"),
                x: Number(entity.x ?? 260),
                y: Number(entity.y ?? 220),
                width: Number(entity.width ?? getPreferredEntitySize(entity).width),
                height: Number(entity.height ?? getPreferredEntitySize(entity).height)
              }))
          }
        }))
      }
    ]
  };

  const highestDiagramSeq = model.diagrams.reduce((highest, diagram) => {
    const match = String(diagram.name ?? "").match(/ER_Diagram_(\d+)/);
    return Math.max(highest, match ? Number(match[1]) : 0);
  }, 0);

  return {
    meta: {
      db: dbMeta.db,
      dbMajorVersion: dbMeta.major,
      dbMinorVersion: dbMeta.minor,
      modelType: "3",
      viewMode: String(model.project?.viewMode ?? "Physical View").toLowerCase().includes("logical")
        ? "logical"
        : "physical",
      activeSubjectAreaId,
      activeThemeId: String(model.project?.activeThemeId ?? DEFAULT_THEME_ID),
      activeDiagramId: String(model.activeDiagramId ?? model.diagrams[0]?.id ?? "1"),
      nextDiagramSeq: highestDiagramSeq + 1,
      nextSubjectAreaSeq: 1
    },
    workspace
  };
}

function importWorkspaceModel(payload) {
  const workspace = payload?.workspace ?? payload?.data ?? payload;
  const subjectAreas = Array.isArray(workspace?.subjectAreas) ? workspace.subjectAreas : [];
  const activeSubjectAreaId = String(payload?.meta?.activeSubjectAreaId ?? subjectAreas[0]?.id ?? "1");
  const activeSubjectArea =
    subjectAreas.find((subjectArea) => String(subjectArea.id) === activeSubjectAreaId) ?? subjectAreas[0];

  if (!activeSubjectArea || !Array.isArray(activeSubjectArea.diagrams) || activeSubjectArea.diagrams.length === 0) {
    throw new Error("Imported JSON is missing subject area diagrams.");
  }

  const entityMap = toIdMap(workspace.entities ?? []);
  const viewMap = toIdMap(workspace.views ?? []);
  const cachedViewMap = toIdMap(workspace.cachedViews ?? []);
  const activeDiagramId = String(payload?.meta?.activeDiagramId ?? activeSubjectArea.diagrams[0]?.id ?? "");
  const dbMeta = resolveDbMetaFromPayloadMeta(payload?.meta);
  const shouldCollapseDocumentHelpers = isDocumentDatabase(dbMeta.label);
  const nestedFieldNames = shouldCollapseDocumentHelpers
    ? [...(workspace.entities ?? []), ...(workspace.views ?? []), ...(workspace.cachedViews ?? [])].reduce(
        (names, entity) => {
          collectNestedFieldNamesFromAttributes(entity?.attributes ?? []).forEach((name) => names.add(name));
          return names;
        },
        new Set()
      )
    : new Set();

  const diagrams = activeSubjectArea.diagrams.map((diagram, diagramIndex) => {
    const entityShapes = diagram.modelShapes?.entities ?? [];
    const viewShapes = diagram.modelShapes?.views ?? [];
    const cachedViewShapes = diagram.modelShapes?.cachedViews ?? [];
    const drawingShapes = diagram.modelShapes?.Shapes ?? [];
    const annotationShapes = diagram.modelShapes?.Annotations ?? [];
    const skippedEntityIds = new Set();
    const includedShapeEntries = [
      ...entityShapes.map((shape) => ({ shape, sourceEntity: entityMap.get(String(shape.id)), objectType: "entity" })),
      ...viewShapes.map((shape) => ({ shape, sourceEntity: viewMap.get(String(shape.id)), objectType: "view" })),
      ...cachedViewShapes.map((shape) => ({
        shape,
        sourceEntity: cachedViewMap.get(String(shape.id)),
        objectType: "materializedView"
      }))
    ].filter(({ shape, sourceEntity }) => {
      if (!shouldCollapseDocumentHelpers) {
        return true;
      }

      const shapeName = String(shape?.name ?? "");
      const shapePhysicalName = String(shape?.physicalName ?? "");
      const helperLikeWithoutSource =
        !sourceEntity &&
        (nestedFieldNames.has(shapeName) || nestedFieldNames.has(shapePhysicalName));

      const helperLikeWithSource =
        !!sourceEntity &&
        sourceEntity.logicalOnly === true &&
        (sourceEntity.attributes?.length ?? 0) === 0 &&
        (
          nestedFieldNames.has(String(sourceEntity.name ?? "")) ||
          nestedFieldNames.has(String(sourceEntity.physicalName ?? "")) ||
          nestedFieldNames.has(shapeName) ||
          nestedFieldNames.has(shapePhysicalName)
        );

      if (helperLikeWithoutSource || helperLikeWithSource) {
        skippedEntityIds.add(String(sourceEntity?.id ?? shape.id));
      }

      return !(helperLikeWithoutSource || helperLikeWithSource);
    });
    const shapeEntityIds = new Set(includedShapeEntries.map(({ shape }) => String(shape.id)));
    const entities = [
      ...includedShapeEntries
    ].map(({ shape, sourceEntity, objectType }) => {
      const fallbackName = shape.physicalName || shape.name || `Entity_${diagramIndex + 1}`;
      const attributes = sourceEntity?.attributes ?? [];

      return {
        id: String(sourceEntity?.id ?? shape.id ?? `${diagram.id}-${slugify(fallbackName) || "entity"}`),
        name: sourceEntity?.name ?? shape.name ?? fallbackName,
        physicalName: sourceEntity?.physicalName || shape.physicalName || sourceEntity?.name || shape.name || fallbackName,
        definition: sourceEntity?.definition ?? "",
        comment: sourceEntity?.comment ?? "",
        physicalOnly: Boolean(sourceEntity?.physicalOnly),
        logicalOnly: Boolean(sourceEntity?.logicalOnly),
        objectType,
        x: Number(shape.x ?? 160),
        y: Number(shape.y ?? 120),
        ...(shape.width != null ? { width: Number(shape.width) } : {}),
        ...(shape.height != null ? { height: Number(shape.height) } : {}),
        indexes: sourceEntity?.indexes ?? [],
        fields: attributes.map((attribute, attributeIndex) =>
          deserializeAttributeToField(attribute, `${shape.id}-field`, attributeIndex)
        )
      };
    });

    const drawingEntities = drawingShapes.map((shape, shapeIndex) => {
      const drawingShape = drawingTypeValueToShape(shape?.shape_type);
      const fallbackId = `${diagram.id}-shape-${shapeIndex + 1}`;
      const fallbackText = String(shape?.text ?? "").trim() || "Drawing";

      return {
        id: String(shape?.id ?? fallbackId),
        name: String(shape?.name ?? fallbackText).trim() || `Shape_${shapeIndex + 1}`,
        physicalName: String(shape?.physicalName ?? shape?.name ?? fallbackText).trim() || `Shape_${shapeIndex + 1}`,
        definition: shape?.definition ?? "",
        comment: shape?.comment ?? "",
        physicalOnly: Boolean(shape?.physicalOnly),
        objectType: "drawing",
        drawingShape,
        drawingText: fallbackText,
        x: Number(shape?.x ?? 100),
        y: Number(shape?.y ?? 0),
        ...(shape?.width != null ? { width: Number(shape.width) } : {}),
        ...(shape?.height != null ? { height: Number(shape.height) } : {}),
        ...(drawingShape === "line"
          ? {
              lineSourceId: String(shape?.parent ?? ""),
              lineTargetId: String(shape?.child ?? ""),
              lineOffsetX: Number(shape?.lineOffsetX ?? 0),
              lineOffsetY: Number(shape?.lineOffsetY ?? 0),
              lineBendPoints: Array.isArray(shape?.lineBendPoints)
                ? shape.lineBendPoints
                    .map((point) => ({
                      x: Number(point?.x),
                      y: Number(point?.y)
                    }))
                    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
                : [],
              ...(shape?.lineSourceAttachment
                ? {
                    lineSourceAttachment: {
                      side: String(shape.lineSourceAttachment.side ?? ""),
                      t: Number(shape.lineSourceAttachment.t ?? 0.5)
                    }
                  }
                : {}),
              ...(shape?.lineTargetAttachment
                ? {
                    lineTargetAttachment: {
                      side: String(shape.lineTargetAttachment.side ?? ""),
                      t: Number(shape.lineTargetAttachment.t ?? 0.5)
                    }
                  }
                : {})
            }
          : {}),
        fields: []
      };
    });

    const annotationEntities = annotationShapes.map((shape, shapeIndex) => {
      const fallbackId = `${diagram.id}-annotation-${shapeIndex + 1}`;
      const fallbackText = String(shape?.text ?? "").trim() || "Annotation";

      return {
        id: String(shape?.id ?? fallbackId),
        name: String(shape?.name ?? fallbackText).trim() || `Annotation_${shapeIndex + 1}`,
        physicalName: String(shape?.physicalName ?? shape?.name ?? fallbackText).trim() || `Annotation_${shapeIndex + 1}`,
        definition: shape?.definition ?? "",
        comment: shape?.comment ?? "",
        physicalOnly: Boolean(shape?.physicalOnly),
        objectType: "annotation",
        annotationShape: drawingTypeValueToShape(shape?.shape_type),
        annotationText: fallbackText,
        x: Number(shape?.x ?? 260),
        y: Number(shape?.y ?? 220),
        ...(shape?.width != null ? { width: Number(shape.width) } : {}),
        ...(shape?.height != null ? { height: Number(shape.height) } : {}),
        fields: []
      };
    });

    const relationshipShapeIds = new Set((diagram.modelShapes?.relationships ?? []).map((shape) => String(shape.id)));
    const relationships = (workspace.relationships ?? [])
      .filter((relationship) => {
        if (
          skippedEntityIds.has(String(relationship.parent ?? relationship.sourceEntityId)) ||
          skippedEntityIds.has(String(relationship.child ?? relationship.targetEntityId))
        ) {
          return false;
        }

        if (relationshipShapeIds.size > 0) {
          return relationshipShapeIds.has(String(relationship.id));
        }

        return (
          shapeEntityIds.has(String(relationship.parent ?? relationship.sourceEntityId)) &&
          shapeEntityIds.has(String(relationship.child ?? relationship.targetEntityId))
        );
      })
      .map((relationship) => {
        const source = entityMap.get(String(relationship.parent ?? relationship.sourceEntityId));
        const target = entityMap.get(String(relationship.child ?? relationship.targetEntityId));

        return normalizeRelationship({
          id: String(relationship.id),
          sourceEntityId: String(relationship.parent ?? relationship.sourceEntityId),
          targetEntityId: String(relationship.child ?? relationship.targetEntityId),
          name: relationship.name ?? getRelationshipName(relationship, source, target),
          physicalName: relationship.physicalName ?? relationship.name ?? relationship.id,
          description: relationship.description ?? relationship.comment ?? "relates_to",
          props: {
            ...(relationship.props ?? {}),
            ...(Array.isArray(relationship?.bendPoints)
              ? {
                  bendPoints: relationship.bendPoints
                    .map((point) => ({
                      x: Number(point?.x),
                      y: Number(point?.y)
                    }))
                    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
                }
              : {})
          },
          parentToChildVerbPhrase: relationship.parentToChildVerbPhrase ?? "",
          childToParentVerbPhrase: relationship.childToParentVerbPhrase ?? "",
          parentAttribute: relationship.parentAttribute ?? "Entity header",
          childAttribute: relationship.childAttribute ?? "Entity header",
          cardinality: relationship.cardinality ?? "1:N",
          relationshipType: relationship.relationshipType ?? "Non-Identifying",
          style: relationship.style ?? "solid"
        });
      });

    return {
      id: String(diagram.id),
      name: diagram.name ?? `ER_Diagram_${diagramIndex + 1}`,
      definition: diagram.definition ?? "",
      displayLevelLogical: String(diagram.displayLevelLogical ?? "1"),
      displayLevelPhysical: String(diagram.displayLevelPhysical ?? "1"),
      entities: [...entities, ...drawingEntities, ...annotationEntities],
      relationships
    };
  });

  const activeDiagram = diagrams.find((diagram) => diagram.id === activeDiagramId) ?? diagrams[0];
  const viewMode = String(payload?.meta?.viewMode ?? "physical").toLowerCase() === "logical"
    ? "Logical View"
    : "Physical View";
  const importedThemes = Array.isArray(workspace?.themes)
    ? workspace.themes.map((theme, index) => ({
        id: String(theme?.id ?? `theme-${index + 1}`),
        name: String(theme?.name ?? `Theme ${index + 1}`),
        settings: normalizeThemeSettings(theme?.settings ?? theme)
      }))
    : [];
  const importedActiveThemeId =
    String(
      payload?.meta?.activeThemeId ??
        workspace?.activeThemeId ??
        workspace?.themes?.find?.((theme) => theme?.isActive)?.id ??
        importedThemes[0]?.id ??
        DEFAULT_THEME_ID
    );

  return {
    project: {
      name: "Data Modeler",
      viewMode,
      database: dbMeta.label,
      databaseVersion: `${dbMeta.major}${dbMeta.minor ? `.${dbMeta.minor}` : ""}`,
      logicalNotation: sampleModel.project.logicalNotation,
      physicalNotation: sampleModel.project.physicalNotation,
      lineStyle: sampleModel.project.lineStyle,
      schemas: (workspace?.schemas ?? []).map((schema) => ({
        id: String(schema.id),
        name: schema.name ?? "",
        comment: schema.comment ?? ""
      })),
      activeThemeId: importedActiveThemeId,
      themes: importedThemes,
      theme: normalizeThemeSettings(
        importedThemes.find((theme) => theme.id === importedActiveThemeId)?.settings ??
          sampleModel.project?.theme
      ),
      subjectArea: activeSubjectArea.name ?? "<model>",
      definition: "Drag entities, define attributes, and wire relationships.",
      diagramDefinition: activeDiagram?.definition ?? "",
      displayLevel: getDisplayLevelValueForViewMode(viewMode, getDiagramDisplayLevelValue(activeDiagram, viewMode))
    },
    activeDiagramId: activeDiagram?.id ?? diagrams[0]?.id ?? "1",
    diagrams
  };
}

function estimateTextWidth(text, factor = 9.2) {
  return String(text ?? "").length * factor;
}

function flattenFieldsForLayout(fields, depth = 0) {
  return (fields ?? []).flatMap((field) => {
    const children = Array.isArray(field.children) ? field.children : [];
    return [
      {
        ...field,
        depth,
        hasChildren: children.length > 0
      },
      ...flattenFieldsForLayout(children, depth + 1)
    ];
  });
}

function getPreferredEntitySize(entity) {
  if (isDrawingEntity(entity)) {
    const drawingText = String(entity.drawingText ?? entity.comment ?? "").trim() || "Drawing";
    const longestLineWidth = Math.max(
      ...drawingText.split(/\r?\n/).map((line) => estimateTextWidth(line, 8.2)),
      90
    );
    const lineCount = Math.max(1, drawingText.split(/\r?\n/).length);

    return {
      width: Math.min(CARD_MAX_WIDTH, Math.max(120, Math.ceil(longestLineWidth + 44))),
      height: Math.max(90, 26 + lineCount * 24)
    };
  }

  if (isAnnotationEntity(entity)) {
    const annotationText = String(entity.annotationText ?? entity.comment ?? "").trim() || "Annotation";
    const longestLineWidth = Math.max(
      ...annotationText.split(/\r?\n/).map((line) => estimateTextWidth(line, 8.2)),
      110
    );
    const lineCount = Math.max(1, annotationText.split(/\r?\n/).length);

    return {
      width: Math.min(CARD_MAX_WIDTH, Math.max(160, Math.ceil(longestLineWidth + 36))),
      height: Math.max(84, 18 + lineCount * 24)
    };
  }

  const fields = flattenFieldsForLayout(entity.fields ?? []);
  const hasNestedFields = fields.some((field) => field.hasChildren || field.depth > 0);
  const hasPrimaryKeySeparator = fields.some(
    (field, index) => index > 0 && field.kind !== "PK" && fields[index - 1]?.kind === "PK"
  );
  const headerWidth = estimateTextWidth(entity.physicalName ?? entity.name ?? "Entity", 12) + 92;
  const widestFieldWidth = Math.max(
    ...fields.map((field) => {
      const indentWidth = field.depth * 18 + (field.hasChildren ? 16 : 0);
      const nameWidth = estimateTextWidth(field.name, 10);
      const typeWidth = estimateTextWidth(field.dataType, 9.1);
      return 48 + indentWidth + 10 + nameWidth + 18 + typeWidth + 28;
    }),
    CARD_BASE_WIDTH
  );

  return {
    width: Math.min(
      CARD_MAX_WIDTH,
      Math.max(CARD_MIN_WIDTH, Math.ceil(Math.max(headerWidth, widestFieldWidth) + (hasNestedFields ? 12 : 0)))
    ),
    height: Math.max(
      CARD_MIN_HEIGHT,
      CARD_HEADER +
        fields.length * ROW_HEIGHT +
        18 +
        (hasNestedFields ? ROW_HEIGHT : 0) +
        (hasPrimaryKeySeparator ? PK_SEPARATOR_EXTRA_HEIGHT : 0)
    )
  };
}

function normalizeRelationship(relationship) {
  const normalizedBendPoints = Array.isArray(relationship?.props?.bendPoints)
    ? relationship.props.bendPoints
        .map((point) => ({
          x: Number(point?.x),
          y: Number(point?.y)
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    : [];

  return {
    ...relationship,
    name: relationship.name ?? relationship.id,
    physicalName: relationship.physicalName ?? relationship.id,
    description: relationship.description ?? "relates_to",
    parentToChildVerbPhrase: relationship.parentToChildVerbPhrase ?? "",
    childToParentVerbPhrase: relationship.childToParentVerbPhrase ?? "",
    props: {
      ...(relationship.props ?? {}),
      ...(normalizedBendPoints.length > 0 ? { bendPoints: normalizedBendPoints } : {})
    },
    parentAttribute: relationship.parentAttribute ?? "Entity header",
    childAttribute: relationship.childAttribute ?? "Entity header",
    migratedKeyIndex: relationship.migratedKeyIndex ?? "Select parent index",
    relationshipType: normalizeRelationshipType(relationship.relationshipType)
  };
}

async function readErrorMessage(response, fallbackMessage) {
  try {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = await response.json();
      return payload?.detail || payload?.title || payload?.message || fallbackMessage;
    }

    const text = await response.text();
    return text.trim() || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function buildBackendFetchFailureMessage(actionLabel, error, apiBaseUrl = API_BASE_URL) {
  const fallback = `${actionLabel} failed. Verify the ASP.NET backend is running and reachable.`;
  const message = error instanceof Error ? String(error.message ?? "").trim() : "";
  const normalizedBaseUrl = String(apiBaseUrl ?? "").trim();
  const isLocalHttpsBackend = /^https:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedBaseUrl);
  const isFetchFailure =
    message === "Failed to fetch" ||
    message === "NetworkError when attempting to fetch resource." ||
    message.includes("NetworkError");

  if (!isFetchFailure) {
    return message || fallback;
  }

  if (isLocalHttpsBackend) {
    return [
      `${actionLabel} failed because the browser rejected the local HTTPS certificate for ${normalizedBaseUrl}.`,
      "Fix one of these:",
      "1. Trust the ASP.NET dev certificate: `dotnet dev-certs https --trust`",
      "2. Restart the backend and browser after trusting the certificate.",
      "3. Or use the local HTTP backend URL instead, for example `http://localhost:5248` via `VITE_API_BASE_URL`."
    ].join(" ");
  }

  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedBaseUrl)) {
    return `${actionLabel} failed because the frontend could not reach ${normalizedBaseUrl}. Make sure the ASP.NET backend is running on that port.`;
  }

  return fallback;
}

function flattenAllFields(fields, depth = 0, parentId = "") {
  return (fields ?? []).flatMap((field) => {
    const current = {
      ...field,
      depth,
      parentId
    };

    return [current, ...flattenAllFields(field.children ?? [], depth + 1, String(field.id ?? ""))];
  });
}

function summarizeModelForAi(model) {
  const diagrams = model.diagrams ?? [];
  const entityMap = new Map();
  const relationshipMap = new Map();

  diagrams.forEach((diagram) => {
    (diagram.entities ?? []).forEach((entity) => {
      const objectType = getEntityObjectType(entity);
      if (objectType === "drawing" || objectType === "annotation") {
        return;
      }

      if (!entityMap.has(entity.id)) {
        entityMap.set(entity.id, entity);
      }
    });

    (diagram.relationships ?? []).forEach((relationship) => {
      if (!relationshipMap.has(relationship.id)) {
        relationshipMap.set(relationship.id, relationship);
      }
    });
  });

  const entities = Array.from(entityMap.values());
  const relationships = Array.from(relationshipMap.values());
  const tables = entities.filter((entity) => getEntityObjectType(entity) === "entity");
  const views = entities.filter((entity) => getEntityObjectType(entity) === "view");
  const materializedViews = entities.filter((entity) => getEntityObjectType(entity) === "materializedView");
  const allFields = entities.flatMap((entity) => flattenAllFields(entity.fields ?? []));
  const indexes = entities.reduce((sum, entity) => sum + (entity.indexes?.length ?? 0), 0);

  return {
    subjectAreas: [{ id: "model", name: model.project?.subjectArea ?? "<model>" }],
    diagrams,
    entities,
    tables,
    views,
    materializedViews,
    relationships,
    allFields,
    indexes,
    schemas: model.project?.schemas ?? [],
    stats: {
      subjectAreas: 1,
      diagrams: diagrams.length,
      tables: tables.length,
      views: views.length,
      materializedViews: materializedViews.length,
      relationships: relationships.length,
      columns: allFields.length,
      indexes,
      schemas: model.project?.schemas?.length ?? 0
    }
  };
}

function buildSummaryDeterministicInsights(model, summaryScope) {
  const findings = [];
  const dbIsDocument = isDocumentDatabase(model.project?.database);
  const commentField = model.project?.viewMode === "Logical View" ? "definition" : "comment";
  const objects = [...summaryScope.tables, ...summaryScope.views, ...summaryScope.materializedViews];

  if (!dbIsDocument) {
    const missingPkObjects = objects.filter((entity) => !(entity.fields ?? []).some((field) => Boolean(field.isPrimary)));
    if (missingPkObjects.length > 0) {
      findings.push({
        id: "missing-primary-keys",
        severity: "high",
        text: `[High] ${missingPkObjects.length} object${missingPkObjects.length === 1 ? "" : "s"} ${missingPkObjects.length === 1 ? "is" : "are"} missing a primary key.`,
        details: missingPkObjects.map((entity) => entity.name ?? entity.physicalName ?? String(entity.id))
      });
    }
  }

  const connectedIds = new Set(
    summaryScope.relationships.flatMap((relationship) => [String(relationship.sourceEntityId ?? ""), String(relationship.targetEntityId ?? "")])
  );
  const isolatedObjects = objects.filter((entity) => !connectedIds.has(String(entity.id)));
  if (isolatedObjects.length > 0) {
    findings.push({
      id: "isolated-objects",
      severity: "medium",
      text: `[Medium] ${isolatedObjects.length} object${isolatedObjects.length === 1 ? "" : "s"} ${isolatedObjects.length === 1 ? "is" : "are"} isolated with no relationships.`,
      details: isolatedObjects.map((entity) => entity.name ?? entity.physicalName ?? String(entity.id))
    });
  }

  const undocumentedObjects = objects.filter((entity) => !String(entity?.[commentField] ?? "").trim());
  if (undocumentedObjects.length > 0) {
    findings.push({
      id: "undocumented-objects",
      severity: "medium",
      text: `[Medium] ${undocumentedObjects.length} object${undocumentedObjects.length === 1 ? "" : "s"} ${undocumentedObjects.length === 1 ? "is" : "are"} missing ${commentField === "definition" ? "definitions" : "comments"}.`,
      details: undocumentedObjects.map((entity) => entity.name ?? entity.physicalName ?? String(entity.id))
    });
  }

  const undocumentedFields = summaryScope.entities.flatMap((entity) =>
    flattenAllFields(entity.fields ?? [])
      .filter((field) => !String(field?.[commentField] ?? "").trim())
      .map((field) => `${entity.name ?? entity.physicalName ?? entity.id}.${field.name ?? field.physicalName ?? field.id}`)
  );
  if (undocumentedFields.length > 0) {
    findings.push({
      id: "undocumented-fields",
      severity: "low",
      text: `[Low] ${undocumentedFields.length} column${undocumentedFields.length === 1 ? "" : "s"} ${undocumentedFields.length === 1 ? "is" : "are"} missing ${commentField === "definition" ? "definitions" : "comments"}.`,
      details: undocumentedFields.slice(0, 25)
    });
  }

  const undocumentedIndexes = summaryScope.entities.flatMap((entity) =>
    (entity.indexes ?? [])
      .filter((index) => !String(index?.comment ?? "").trim() && !String(index?.definition ?? "").trim())
      .map((index) => `${entity.name ?? entity.physicalName ?? entity.id}.${index.name ?? index.physicalName ?? index.id}`)
  );
  if (undocumentedIndexes.length > 0) {
    findings.push({
      id: "undocumented-indexes",
      severity: "low",
      text: `[Low] ${undocumentedIndexes.length} index${undocumentedIndexes.length === 1 ? "" : "es"} ${undocumentedIndexes.length === 1 ? "is" : "are"} missing comments or definitions.`,
      details: undocumentedIndexes.slice(0, 25)
    });
  }

  const relationshipDocGaps = summaryScope.relationships.filter((relationship) => {
    if (model.project?.viewMode === "Logical View") {
      return !String(relationship.parentToChildVerbPhrase ?? "").trim() || !String(relationship.childToParentVerbPhrase ?? "").trim();
    }

    return !String(relationship.description ?? "").trim();
  });
  if (relationshipDocGaps.length > 0) {
    findings.push({
      id: "relationship-doc-gaps",
      severity: "medium",
      text:
        model.project?.viewMode === "Logical View"
          ? `[Medium] ${relationshipDocGaps.length} relationship${relationshipDocGaps.length === 1 ? "" : "s"} ${relationshipDocGaps.length === 1 ? "is" : "are"} missing verb phrases.`
          : `[Medium] ${relationshipDocGaps.length} relationship${relationshipDocGaps.length === 1 ? "" : "s"} ${relationshipDocGaps.length === 1 ? "is" : "are"} missing descriptions.`,
      details: relationshipDocGaps.map((relationship) => relationship.name ?? relationship.physicalName ?? String(relationship.id))
    });
  }

  const wideObjects = objects.filter((entity) => flattenAllFields(entity.fields ?? []).length > 30);
  if (wideObjects.length > 0) {
    findings.push({
      id: "wide-objects",
      severity: "low",
      text: `[Low] ${wideObjects.length} object${wideObjects.length === 1 ? "" : "s"} ${wideObjects.length === 1 ? "has" : "have"} more than 30 columns.`,
      details: wideObjects.map((entity) => `${entity.name ?? entity.physicalName ?? entity.id} (${flattenAllFields(entity.fields ?? []).length})`)
    });
  }

  const nameCounts = new Map();
  objects.forEach((entity) => {
    const key = String(entity.name ?? entity.physicalName ?? "").trim().toLowerCase();
    if (!key) {
      return;
    }
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  });
  const duplicateNames = Array.from(nameCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
  if (duplicateNames.length > 0) {
    findings.push({
      id: "duplicate-object-names",
      severity: "medium",
      text: `[Medium] ${duplicateNames.length} duplicate object name${duplicateNames.length === 1 ? "" : "s"} detected.`,
      details: duplicateNames
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: "no-major-findings",
      severity: "info",
      text: "No major structural or documentation issues detected.",
      details: []
    });
  }

  return findings;
}

function buildSummaryChartSegments(stats) {
  const palette = [
    "#57d2d8",
    "#f9bd47",
    "#6aa9ff",
    "#ff7589",
    "#f5c95e",
    "#28c45c",
    "#aa82f1",
    "#ff9330",
    "#9fb0c3"
  ];
  const items = [
    { key: "subjectAreas", label: "Subject Areas", value: stats.subjectAreas },
    { key: "diagrams", label: "Diagrams", value: stats.diagrams },
    { key: "tables", label: "Tables", value: stats.tables },
    { key: "views", label: "Views", value: stats.views },
    { key: "materializedViews", label: "Materialized Views", value: stats.materializedViews },
    { key: "relationships", label: "Relationships", value: stats.relationships },
    { key: "columns", label: "Columns", value: stats.columns },
    { key: "indexes", label: "Indexes", value: stats.indexes },
    { key: "schemas", label: "Schemas", value: stats.schemas }
  ].filter((item) => item.value > 0);

  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  return {
    total,
    segments: items.map((item, index) => {
      const dash = total > 0 ? (item.value / total) * 100 : 0;
      const segment = {
        ...item,
        color: palette[index % palette.length],
        dash,
        offset
      };
      offset += dash;
      return segment;
    })
  };
}

function buildAiTuningObjects(model, summaryScope) {
  const flattenEntityFields = (entity) =>
    flattenAllFields(entity.fields ?? []).map((field) => ({
      objectType: "attribute",
      objectId: String(field.id ?? ""),
      ownerId: String(entity.id ?? ""),
      ownerName: String(entity.name ?? entity.physicalName ?? ""),
      label: `${entity.name ?? entity.physicalName ?? entity.id}.${field.name ?? field.physicalName ?? field.id}`,
      name: String(field.name ?? ""),
      physicalName: String(field.physicalName ?? ""),
      definition: String(field.definition ?? ""),
      comment: String(field.comment ?? ""),
      datatype: String(field.dataType ?? ""),
      description: ""
    }));

  const entityObjects = summaryScope.entities.flatMap((entity) => {
    const objectType = getEntityObjectType(entity);
    return [
      {
        objectType,
        objectId: String(entity.id ?? ""),
        label: `${objectType === "materializedView" ? "Materialized View" : objectType === "view" ? "View" : "Entity"}: ${entity.name ?? entity.physicalName ?? entity.id}`,
        name: String(entity.name ?? ""),
        physicalName: String(entity.physicalName ?? ""),
        definition: String(entity.definition ?? ""),
        comment: String(entity.comment ?? ""),
        datatype: "",
        description: ""
      },
      ...flattenEntityFields(entity),
      ...(entity.indexes ?? []).map((index) => ({
        objectType: "index",
        objectId: String(index.id ?? ""),
        ownerId: String(entity.id ?? ""),
        ownerName: String(entity.name ?? entity.physicalName ?? ""),
        label: `Index: ${entity.name ?? entity.physicalName ?? entity.id}.${index.name ?? index.physicalName ?? index.id}`,
        name: String(index.name ?? ""),
        physicalName: String(index.physicalName ?? ""),
        definition: String(index.definition ?? ""),
        comment: String(index.comment ?? ""),
        datatype: "",
        description: ""
      }))
    ];
  });

  const relationshipObjects = summaryScope.relationships.map((relationship) => ({
    objectType: "relationship",
    objectId: String(relationship.id ?? ""),
    label: `Relationship: ${relationship.name ?? relationship.physicalName ?? relationship.id}`,
    name: String(relationship.name ?? ""),
    physicalName: String(relationship.physicalName ?? ""),
    definition: String(relationship.definition ?? ""),
    comment: String(relationship.comment ?? ""),
    datatype: "",
    description: String(relationship.description ?? "")
  }));

  const schemaObjects = summaryScope.schemas.map((schema) => ({
    objectType: "schema",
    objectId: String(schema.id ?? ""),
    label: `Schema: ${schema.name ?? schema.id}`,
    name: String(schema.name ?? ""),
    physicalName: String(schema.name ?? ""),
    definition: "",
    comment: String(schema.comment ?? ""),
    datatype: "",
    description: ""
  }));

  const diagramObjects = summaryScope.diagrams.map((diagram) => ({
    objectType: "diagram",
    objectId: String(diagram.id ?? ""),
    label: `Diagram: ${diagram.name ?? diagram.id}`,
    name: String(diagram.name ?? ""),
    physicalName: String(diagram.name ?? ""),
    definition: String(diagram.definition ?? ""),
    comment: "",
    datatype: "",
    description: ""
  }));

  return [
    {
      objectType: "subjectArea",
      objectId: "model",
      label: `Subject Area: ${model.project?.subjectArea ?? "<model>"}`,
      name: String(model.project?.subjectArea ?? "<model>"),
      physicalName: String(model.project?.subjectArea ?? "<model>"),
      definition: String(model.project?.definition ?? ""),
      comment: "",
      datatype: "",
      description: ""
    },
    ...diagramObjects,
    ...entityObjects,
    ...relationshipObjects,
    ...schemaObjects
  ];
}

function normalizeModel(rawModel) {
  const baseModel = clone(rawModel ?? sampleModel);
  const normalizedProject = mergeProjectDefaults(baseModel.project);

  if (baseModel?.workspace?.subjectAreas || baseModel?.data?.subjectAreas || baseModel?.subjectAreas) {
    return syncProjectWithActiveDiagram(importWorkspaceModel(baseModel));
  }

  if (Array.isArray(baseModel.diagrams) && baseModel.diagrams.length > 0) {
    return syncProjectWithActiveDiagram({
      ...baseModel,
      project: normalizedProject,
      diagrams: baseModel.diagrams.map((diagram) => ({
        ...diagram,
        displayLevelLogical: String(
          diagram.displayLevelLogical ??
            getDisplayLevelValueForViewMode("Logical View", getDefaultDisplayLevelForViewMode("Logical View"))
        ),
        displayLevelPhysical: String(
          diagram.displayLevelPhysical ??
            getDisplayLevelValueForViewMode("Physical View", getDefaultDisplayLevelForViewMode("Physical View"))
        ),
        relationships: (diagram.relationships ?? []).map(normalizeRelationship)
      })),
      activeDiagramId: baseModel.activeDiagramId ?? baseModel.diagrams[0].id
    });
  }

  const diagramId = "er-diagram-1";

  return {
    project: normalizedProject,
    activeDiagramId: diagramId,
    diagrams: [
      {
        id: diagramId,
        name: "ER_Diagram_1",
        entities: baseModel.entities ?? [],
        relationships: baseModel.relationships ?? []
      }
    ]
  };
}

export default function App() {
  const savedPanelWidths = readPanelWidths();
  const initialModel = normalizeModel(readLocalModel() ?? sampleModel);
  const savedAiModelerSettings = readAiModelerSettings();
  const [model, setModel] = useState(initialModel);
  const [jsonDraft, setJsonDraft] = useState(() => readJsonDraft());
  const [isJsonViewerOpen, setIsJsonViewerOpen] = useState(false);
  const [isModelPropertiesOpen, setIsModelPropertiesOpen] = useState(false);
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAiTuningOpen, setIsAiTuningOpen] = useState(false);
  const [summarySubjectAreaId, setSummarySubjectAreaId] = useState("model");
  const [summaryInsightsLoading, setSummaryInsightsLoading] = useState(false);
  const [summaryInsightsCache, setSummaryInsightsCache] = useState({});
  const [summaryDetExpanded, setSummaryDetExpanded] = useState({});
  const [aiTuningFindings, setAiTuningFindings] = useState([]);
  const [selectedAiTuningKeys, setSelectedAiTuningKeys] = useState([]);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [selectedEntityIds, setSelectedEntityIds] = useState(() =>
    initialModel.diagrams[0]?.entities[0]?.id ? [initialModel.diagrams[0].entities[0].id] : []
  );
  const [selectedRelationshipId, setSelectedRelationshipId] = useState(null);
  const [selectedAttributeId, setSelectedAttributeId] = useState(null);
  const [expandedFieldIds, setExpandedFieldIds] = useState({});
  const [linkDraft, setLinkDraft] = useState(null);
  const [focusEntityRequest, setFocusEntityRequest] = useState(null);
  const [focusRelationshipRequest, setFocusRelationshipRequest] = useState(null);
  const [panelWidths, setPanelWidths] = useState(() => ({
    left: savedPanelWidths?.left ?? DEFAULT_LEFT_PANEL_WIDTH,
    right: savedPanelWidths?.right ?? DEFAULT_RIGHT_PANEL_WIDTH
  }));
  const [diagramViewport, setDiagramViewport] = useState(DEFAULT_VIEWPORT);
  const [viewResetToken, setViewResetToken] = useState(0);
  const [providers, setProviders] = useState([
    { id: "sqlserver" },
    { id: "postgresql" },
    { id: "mongodb" }
  ]);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const [status, setStatus] = useState("Using local model state.");
  const [importForm, setImportForm] = useState({
    provider: "postgresql",
    connectionString: "",
    databaseName: ""
  });
  const [reverseEngineering, setReverseEngineering] = useState({
    isOpen: false,
    isConnecting: false,
    isDatabaseDialogOpen: false,
    dialogStep: "databases",
    connectionString: "",
    server: "",
    port: "5432",
    databaseNameInput: "master",
    userName: "",
    password: "",
    useEncryptedConnection: false,
    availableDatabases: [],
    highlightedAvailableDatabaseNames: [],
    selectedDatabaseName: "",
    selectedDatabaseNames: [],
    highlightedSelectedDatabaseNames: [],
    isLoadingCollections: false,
    isRunning: false,
    availableCollections: [],
    selectedCollectionNames: [],
    highlightedAvailableCollectionNames: [],
    highlightedSelectedCollectionNames: []
  });
  const [aiModeler, setAiModeler] = useState(() =>
    normalizeAiModelerSettings({
      ...createDefaultAiModelerSettings(),
      ...(savedAiModelerSettings ?? {})
    })
  );
  const [themeLibraryDraft, setThemeLibraryDraft] = useState(() => normalizeThemeLibrary(initialModel.project).themes);
  const [selectedThemeDraftId, setSelectedThemeDraftId] = useState(
    () => normalizeThemeLibrary(initialModel.project).activeThemeId
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiActiveTask, setAiActiveTask] = useState("");
  const [aiStartedAt, setAiStartedAt] = useState(0);
  const [aiElapsedSec, setAiElapsedSec] = useState(0);
  const resizeState = useRef(null);
  const jsonFileInputRef = useRef(null);
  const activeDiagram = useMemo(
    () => model.diagrams.find((diagram) => diagram.id === model.activeDiagramId) ?? model.diagrams[0],
    [model]
  );
  const resolvedTheme = useMemo(
    () => ({
      ...DEFAULT_THEME_SETTINGS,
      ...(model.project?.theme ?? {})
    }),
    [model.project?.theme]
  );
  const selectedThemeDraft = useMemo(
    () => themeLibraryDraft.find((theme) => theme.id === selectedThemeDraftId) ?? themeLibraryDraft[0] ?? null,
    [themeLibraryDraft, selectedThemeDraftId]
  );
  const themeCssVars = useMemo(
    () => ({
      "--default-font": `"${resolvedTheme.defaultFont}", sans-serif`,
      "--entity-font": `"${resolvedTheme.entityFont}", sans-serif`,
      "--attribute-font": `"${resolvedTheme.attributeFont}", sans-serif`,
      "--relationship-font": `"${resolvedTheme.relationshipTextFont}", sans-serif`,
      "--relationship-line-color": resolvedTheme.relationshipLineColor,
      "--relationship-line-width": String(resolvedTheme.relationshipLineWidth ?? "2.5"),
      "--diagram-fill": resolvedTheme.diagramFill,
      "--entity-fill": toRgba(resolvedTheme.entityFill, 0.95),
      "--pk-color": resolvedTheme.pkColumnColor,
      "--pk-color-soft": toRgba(resolvedTheme.pkColumnColor, 0.18),
      "--fk-color": resolvedTheme.fkColumnColor,
      "--fk-color-soft": toRgba(resolvedTheme.fkColumnColor, 0.22)
    }),
    [resolvedTheme]
  );
  const visibleDiagramEntities = useMemo(
    () =>
      (activeDiagram?.entities ?? []).filter(
        (entity) => {
          if (model.project.viewMode === "Logical View") {
            return !entity.physicalOnly;
          }

          if (model.project.viewMode === "Physical View") {
            return !entity.logicalOnly;
          }

          return true;
        }
      ),
    [activeDiagram, model.project.viewMode]
  );
  const tabs = useMemo(
    () =>
      model.diagrams.map((diagram) => ({
        id: diagram.id,
        label: diagram.name,
        active: diagram.id === model.activeDiagramId
      })),
    [model]
  );
  const selectedEntityId = selectedEntityIds.at(-1) ?? null;

  const selectedEntity = useMemo(
    () => activeDiagram?.entities.find((entity) => entity.id === selectedEntityId) ?? null,
    [activeDiagram, selectedEntityId]
  );
  const selectedRelationship = useMemo(
    () => activeDiagram?.relationships.find((relationship) => relationship.id === selectedRelationshipId) ?? null,
    [activeDiagram, selectedRelationshipId]
  );
  const selectedAttribute = useMemo(
    () => findFieldById(selectedEntity?.fields ?? [], selectedAttributeId),
    [selectedEntity, selectedAttributeId]
  );
  const summaryScope = useMemo(() => summarizeModelForAi(model), [model]);
  const summarySubjectAreas = summaryScope.subjectAreas;
  const summarySubjectAreaName =
    summarySubjectAreas.find((item) => item.id === summarySubjectAreaId)?.name ??
    summarySubjectAreas[0]?.name ??
    model.project.subjectArea ??
    "<model>";
  const summaryDeterministic = useMemo(
    () => buildSummaryDeterministicInsights(model, summaryScope),
    [model, summaryScope]
  );
  const summaryStats = summaryScope.stats;
  const summaryChart = useMemo(() => buildSummaryChartSegments(summaryStats), [summaryStats]);
  const summaryInsights = summaryInsightsCache[summarySubjectAreaId] ?? {
    aiSummary: "",
    aiRecommendations: []
  };

  useEffect(() => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(model));
  }, [model]);

  useEffect(() => {
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(panelWidths));
  }, [panelWidths]);

  useEffect(() => {
    window.localStorage.setItem(JSON_DRAFT_STORAGE_KEY, jsonDraft);
  }, [jsonDraft]);

  useEffect(() => {
    window.localStorage.setItem(
      AI_MODELER_STORAGE_KEY,
      JSON.stringify({
        engine: aiModeler.engine,
        schemaDescription: aiModeler.schemaDescription,
        azureOpenAi: aiModeler.azureOpenAi,
        openAi: aiModeler.openAi
      })
    );
  }, [aiModeler]);

  useEffect(() => {
    if (!aiLoading || !aiStartedAt) {
      setAiElapsedSec(0);
      return undefined;
    }

    const updateElapsed = () => {
      setAiElapsedSec(Math.max(0, Math.floor((Date.now() - aiStartedAt) / 1000)));
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [aiLoading, aiStartedAt]);

  useEffect(() => {
    if (!isSummaryOpen) {
      return;
    }

    if (!summarySubjectAreas.some((item) => item.id === summarySubjectAreaId)) {
      setSummarySubjectAreaId(summarySubjectAreas[0]?.id ?? "model");
    }
  }, [isSummaryOpen, summarySubjectAreaId, summarySubjectAreas]);

  useEffect(() => {
    if (!isThemeSettingsOpen) {
      const normalizedThemeLibrary = normalizeThemeLibrary(model.project);
      setThemeLibraryDraft(normalizedThemeLibrary.themes);
      setSelectedThemeDraftId(normalizedThemeLibrary.activeThemeId);
    }
  }, [isThemeSettingsOpen, model.project?.themes, model.project?.activeThemeId]);

  useEffect(() => {
    if (!selectedEntityId) {
      return;
    }

    const stillVisible = visibleDiagramEntities.some((entity) => entity.id === selectedEntityId);
    if (!stillVisible) {
      setSelectedEntityIds([]);
      setSelectedAttributeId(null);
    }
  }, [selectedEntityId, visibleDiagramEntities]);

  useEffect(() => {
    if (!selectedEntity) {
      if (selectedAttributeId !== null) {
        setSelectedAttributeId(null);
      }
      return;
    }

    const fieldIds = collectFieldIds(selectedEntity.fields ?? []);
    if (fieldIds.length === 0) {
      if (selectedAttributeId !== null) {
        setSelectedAttributeId(null);
      }
      return;
    }

    if (!selectedAttributeId || !fieldIds.includes(selectedAttributeId)) {
      setSelectedAttributeId(fieldIds[0]);
    }
  }, [selectedEntity, selectedAttributeId]);

  useEffect(() => {
    loadProviders();
    loadDiagram();
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handlePointerMove(event) {
      if (!resizeState.current) {
        return;
      }

      if (resizeState.current.side === "left") {
        const nextLeft = Math.min(
          MAX_PANEL_WIDTH,
          Math.max(MIN_PANEL_WIDTH, Math.round(event.clientX - 14))
        );

        setPanelWidths((current) => ({
          ...current,
          left: nextLeft
        }));
        return;
      }

      const nextRight = Math.min(
        MAX_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, Math.round(window.innerWidth - event.clientX - 14))
      );

      setPanelWidths((current) => ({
        ...current,
        right: nextRight
      }));
    }

    function handlePointerUp() {
      resizeState.current = null;
      document.body.classList.remove("panel-resizing");
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable
        )
      ) {
        return;
      }

      if (selectedEntityIds.length === 0) {
        if (!(event.metaKey && event.key.toLowerCase() === "a")) {
          return;
        }
      }

      if (event.metaKey && event.key.toLowerCase() === "a") {
        if (!activeDiagram) {
          return;
        }

        event.preventDefault();
        setSelectedEntityIds(activeDiagram.entities.map((entity) => entity.id));
        setSelectedRelationshipId(null);
        setLinkDraft(null);
        setStatus(
          `Selected ${activeDiagram.entities.length} ${activeDiagram.entities.length === 1 ? "entity" : "entities"}.`
        );
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleDeleteEntitiesByIds(selectedEntityIds);
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      const deltaByKey = {
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step }
      };

      const delta = deltaByKey[event.key];

      if (!delta || !activeDiagram) {
        return;
      }

      event.preventDefault();
      const updates = activeDiagram.entities
        .filter((entity) => selectedEntityIds.includes(entity.id))
        .map((entity) => ({
          id: entity.id,
          x: Math.max(24, entity.x + delta.x),
          y: Math.max(24, entity.y + delta.y)
        }));

      handleMoveEntities(selectedEntityIds, updates);
      setStatus(
        `Moved ${selectedEntityIds.length} selected ${selectedEntityIds.length === 1 ? "entity" : "entities"}.`
      );
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDiagram, selectedEntityIds]);

  const isDesktopLayout = windowWidth > 1380;
  const databaseVersionOptions = DATABASE_VERSION_OPTIONS[model.project.database] ?? ["1.0"];
  const displayLevelOptions = getDisplayLevelOptionsForViewMode(model.project.viewMode);
  const dbEngine = normalizeDbEngine(model.project.database);
  const isPhysicalViewMode = model.project.viewMode === "Physical View";
  const datatypeOptions = getDatatypeOptionsForEngine(dbEngine);
  const showViewObjectsUi = isPhysicalViewMode && supportsViewObjects(dbEngine);
  const showCachedViewObjectsUi = isPhysicalViewMode && supportsCachedViews(dbEngine);
  const cachedViewUiName =
    dbEngine === "teradata"
      ? "Join Index"
      : ["redshift", "bigquery", "databricks", "hive"].includes(dbEngine)
        ? "CTAS"
        : "Materialized View";
  const reverseEngineeringSelectedDatabaseSet = new Set(reverseEngineering.selectedDatabaseNames ?? []);
  const reverseEngineeringAvailableDatabaseOptions = (reverseEngineering.availableDatabases ?? []).filter(
    (database) => !reverseEngineeringSelectedDatabaseSet.has(database.name)
  );
  const reverseEngineeringSelectedDatabaseOptions = (reverseEngineering.availableDatabases ?? []).filter(
    (database) => reverseEngineeringSelectedDatabaseSet.has(database.name)
  );
  const reverseEngineeringSelectedCollectionSet = new Set(reverseEngineering.selectedCollectionNames ?? []);
  const reverseEngineeringAvailableCollectionOptions = (reverseEngineering.availableCollections ?? []).filter(
    (collection) => !reverseEngineeringSelectedCollectionSet.has(collection.name)
  );
  const reverseEngineeringSelectedCollectionOptions = (reverseEngineering.availableCollections ?? []).filter(
    (collection) => reverseEngineeringSelectedCollectionSet.has(collection.name)
  );
  const reverseEngineeringProvider = normalizeDbEngine(model.project?.database);
  const reverseEngineeringLabels = getReverseEngineeringLabels(reverseEngineeringProvider);

  useEffect(() => {
    if (!linkDraft) {
      return;
    }

    if (linkDraft.relationshipType === "Derived" && !isPhysicalViewMode) {
      setLinkDraft(null);
      setStatus("Logical View hides view-specific relationship tools.");
      return;
    }

    if (linkDraft.relationshipType === "Subtype" && isPhysicalViewMode) {
      setLinkDraft(null);
      setStatus("Physical View hides sub-category relationship tools.");
    }
  }, [isPhysicalViewMode, linkDraft]);

  function createFreshSampleModel() {
    return normalizeModel(sampleModel);
  }

  function createEmptyWorkspaceModel() {
    const nextProject = {
      ...model.project,
      diagramDefinition: "",
      definition: ""
    };
    const blankDiagram = {
      id: `er-diagram-${Date.now()}`,
      name: "ER_Diagram_1",
      definition: "",
      displayLevelLogical: getDisplayLevelValueForViewMode(
        "Logical View",
        getDefaultDisplayLevelForViewMode("Logical View")
      ),
      displayLevelPhysical: getDisplayLevelValueForViewMode(
        "Physical View",
        getDefaultDisplayLevelForViewMode("Physical View")
      ),
      entities: [],
      relationships: []
    };

    return syncProjectWithActiveDiagram(
      {
        project: nextProject,
        activeDiagramId: blankDiagram.id,
        diagrams: [blankDiagram]
      },
      nextProject,
      blankDiagram.id
    );
  }

  function getEntitySize(entity) {
    const preferredSize = getPreferredEntitySize(entity);
    const width = Math.max(entity.width ?? 0, preferredSize.width);
    const height = Math.max(entity.height ?? 0, preferredSize.height);
    return { width, height };
  }

  function autoLayoutDiagramForProject(diagram, project, viewport = diagramViewport) {
    return {
      ...diagram,
      entities: buildAutoLayout(
        diagram.entities ?? [],
        diagram.relationships ?? [],
        viewport
      )
    };
  }

  function buildAutoLayout(entities, relationships, viewport) {
    if (entities.length === 0) {
      return entities;
    }

    const fixedEntities = entities.filter((entity) => isAnnotationEntity(entity) || isDrawingEntity(entity));
    const layoutEntities = entities.filter((entity) => !isAnnotationEntity(entity) && !isDrawingEntity(entity));

    if (layoutEntities.length === 0) {
      return entities;
    }

    const padding = 48;
    const gapX = 42;
    const gapY = 42;
    const usableWidth = Math.max(viewport.width - padding * 2, 480);
    const usableHeight = Math.max(viewport.height - padding * 2, 480);
    const orderedEntities = [...layoutEntities].sort((left, right) => {
      const leftDegree = relationships.filter(
        (relationship) =>
          relationship.sourceEntityId === left.id || relationship.targetEntityId === left.id
      ).length;
      const rightDegree = relationships.filter(
        (relationship) =>
          relationship.sourceEntityId === right.id || relationship.targetEntityId === right.id
      ).length;

      if (rightDegree !== leftDegree) {
        return rightDegree - leftDegree;
      }

      return left.physicalName.localeCompare(right.physicalName);
    });
    const averageCardWidth =
      orderedEntities.reduce((sum, entity) => sum + getEntitySize(entity).width, 0) / orderedEntities.length;
    const aspectRatio = usableWidth / usableHeight;
    const estimatedColumns = Math.round(Math.sqrt(orderedEntities.length * aspectRatio));
    const maxColumnsByWidth = Math.max(1, Math.floor((usableWidth + gapX) / (averageCardWidth + gapX)));
    const columnCount = Math.max(2, Math.min(orderedEntities.length, maxColumnsByWidth, estimatedColumns || 2));
    const columns = Array.from({ length: columnCount }, () => ({
      items: [],
      height: 0,
      width: 220
    }));

    orderedEntities.forEach((entity, index) => {
      const targetColumn = columns.reduce((bestIndex, column, columnIndex) => {
        if (column.height < columns[bestIndex].height) {
          return columnIndex;
        }

        return bestIndex;
      }, index % columnCount);

      const size = getEntitySize(entity);
      columns[targetColumn].items.push(entity);
      columns[targetColumn].height += (columns[targetColumn].items.length > 1 ? gapY : 0) + size.height;
      columns[targetColumn].width = Math.max(columns[targetColumn].width, size.width);
    });

    const totalWidth =
      columns.reduce((sum, column) => sum + column.width, 0) + gapX * Math.max(0, columns.length - 1);
    const maxColumnHeight = Math.max(...columns.map((column) => column.height));
    const horizontalOffset = padding + Math.max(0, Math.floor((usableWidth - totalWidth) / 2));
    const verticalOffset = padding;
    const positionedEntities = [];
    let currentX = horizontalOffset;

    columns.forEach((column, columnIndex) => {
      const staggerOffset = columnIndex % 2 === 0 ? 0 : Math.min(36, Math.floor(gapY * 0.45));
      let currentY = verticalOffset + staggerOffset;

      column.items.forEach((entity) => {
        const size = getEntitySize(entity);

        positionedEntities.push({
          ...entity,
          x: currentX,
          y: currentY,
          width: size.width,
          height: size.height
        });

        currentY += size.height + gapY;
      });

      currentX += column.width + gapX;
    });

    const positionedMap = new Map(
      [...orderedEntities, ...fixedEntities].map((entity) => [
        entity.id,
        positionedEntities.find((positionedEntity) => positionedEntity.id === entity.id) ?? entity
      ])
    );

    return entities.map((entity) => positionedMap.get(entity.id) ?? entity);
  }

  async function loadProviders() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/providers`);
      if (!response.ok) {
        throw new Error("Provider request failed");
      }

      const data = await response.json();
      setProviders(data);
    } catch (error) {
      setStatus(
        `${buildBackendFetchFailureMessage("Provider loading", error)} Using built-in provider list.`
      );
    }
  }

  async function loadDiagram() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/diagram`);

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();
      const normalizedData = normalizeModel(data);
      const relaidOutData = {
        ...normalizedData,
        diagrams: normalizedData.diagrams.map((diagram) =>
          diagram.id === normalizedData.activeDiagramId
            ? autoLayoutDiagramForProject(diagram, normalizedData.project)
            : diagram
        )
      };
      const normalizedActiveDiagram =
        relaidOutData.diagrams.find((diagram) => diagram.id === relaidOutData.activeDiagramId) ??
        relaidOutData.diagrams[0];
      setModel(relaidOutData);
      setSelectedEntityIds(normalizedActiveDiagram?.entities[0]?.id ? [normalizedActiveDiagram.entities[0].id] : []);
      setSelectedRelationshipId(null);
      setStatus("Loaded model from ASP.NET Core Web API and applied auto-layout.");
    } catch (error) {
      setStatus(
        `${buildBackendFetchFailureMessage("Diagram loading", error)} Showing local sample model.`
      );
    }
  }

  function handleReloadSample() {
    const freshSample = createFreshSampleModel();
    const freshActiveDiagram =
      freshSample.diagrams.find((diagram) => diagram.id === freshSample.activeDiagramId) ??
      freshSample.diagrams[0];
    setModel(freshSample);
    setSelectedEntityIds(freshActiveDiagram?.entities[0]?.id ? [freshActiveDiagram.entities[0].id] : []);
    setSelectedRelationshipId(null);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(freshSample));
    setJsonDraft("");
    setViewResetToken((current) => current + 1);
    setStatus("Reloaded the original local sample model.");
  }

  function handleClearWorkspace() {
    const confirmed = window.confirm(
      "Clear the current workspace? This will remove all diagrams, entities, relationships, and unsaved changes."
    );

    if (!confirmed) {
      return;
    }

    const clearedModel = createEmptyWorkspaceModel();
    setModel(clearedModel);
    setSelectedEntityIds([]);
    setSelectedRelationshipId(null);
    setSelectedAttributeId(null);
    setLinkDraft(null);
    setJsonDraft("");
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clearedModel));
    setViewResetToken((current) => current + 1);
    setStatus("Cleared the workspace.");
  }

  function handleProjectChange(field, value) {
    setModel((current) => {
      const nextProject = { ...current.project };

      if (field === "database") {
        nextProject.database = value;
        const nextVersions = DATABASE_VERSION_OPTIONS[value] ?? ["1.0"];
        nextProject.databaseVersion = nextVersions.includes(nextProject.databaseVersion)
          ? nextProject.databaseVersion
          : nextVersions[0];
        return {
          ...current,
          project: nextProject
        };
      }

      if (field === "viewMode") {
        nextProject.viewMode = value;
        return syncProjectWithActiveDiagram(
          {
            ...current,
            project: nextProject
          },
          nextProject
        );
      }

      if (field === "displayLevel") {
        nextProject.displayLevel = value;
        return {
          ...current,
          project: nextProject,
          diagrams: current.diagrams.map((diagram) =>
            diagram.id === current.activeDiagramId
              ? {
                  ...diagram,
                  ...(nextProject.viewMode === "Logical View"
                    ? { displayLevelLogical: getDisplayLevelValueForViewMode("Logical View", value) }
                    : { displayLevelPhysical: getDisplayLevelValueForViewMode("Physical View", value) })
                }
              : diagram
          )
        };
      }

      nextProject[field] = value;
      return {
        ...current,
        project: nextProject
      };
    });

    if (field === "database") {
      setStatus(`Changed database to ${value}.`);
      return;
    }

    if (field === "viewMode") {
      setStatus(`Changed view mode to ${value}.`);
      return;
    }

    if (field === "databaseVersion") {
      setStatus(`Changed database version to ${value}.`);
      return;
    }

    if (field === "logicalNotation") {
      setStatus(`Changed logical notation to ${value}.`);
      return;
    }

    if (field === "physicalNotation") {
      setStatus(`Changed physical notation to ${value}.`);
      return;
    }

    if (field === "lineStyle") {
      setStatus(`Changed line style to ${value}.`);
    }
  }

  function handleThemeDraftChange(field, value) {
    setThemeLibraryDraft((current) =>
      current.map((theme) =>
        theme.id === selectedThemeDraftId
          ? {
              ...theme,
              settings: {
                ...normalizeThemeSettings(theme.settings),
                [field]: value
              }
            }
          : theme
      )
    );
  }

  function handleThemeNameChange(value) {
    setThemeLibraryDraft((current) =>
      current.map((theme) =>
        theme.id === selectedThemeDraftId
          ? {
              ...theme,
              name: value
            }
          : theme
      )
    );
  }

  function handleSelectThemeDraft(themeId) {
    setSelectedThemeDraftId(themeId);
  }

  function handleAddThemeDraft() {
    const nextIndex = themeLibraryDraft.length + 1;
    const nextThemeId = `theme-${Date.now()}`;
    const baseSettings = normalizeThemeSettings(selectedThemeDraft?.settings ?? DEFAULT_THEME_SETTINGS);
    const nextTheme = {
      id: nextThemeId,
      name: `Theme ${nextIndex}`,
      settings: baseSettings
    };

    setThemeLibraryDraft((current) => [...current, nextTheme]);
    setSelectedThemeDraftId(nextThemeId);
  }

  function handleDeleteThemeDraft() {
    if (themeLibraryDraft.length <= 1) {
      return;
    }

    const selectedIndex = themeLibraryDraft.findIndex((theme) => theme.id === selectedThemeDraftId);
    const remainingThemes = themeLibraryDraft.filter((theme) => theme.id !== selectedThemeDraftId);
    const fallbackTheme =
      remainingThemes[Math.min(selectedIndex, Math.max(remainingThemes.length - 1, 0))] ?? remainingThemes[0] ?? null;

    setThemeLibraryDraft(remainingThemes);
    setSelectedThemeDraftId(fallbackTheme?.id ?? DEFAULT_THEME_ID);
  }

  function handleOpenThemeSettings() {
    const normalizedThemeLibrary = normalizeThemeLibrary(model.project);
    setThemeLibraryDraft(normalizedThemeLibrary.themes);
    setSelectedThemeDraftId(normalizedThemeLibrary.activeThemeId);
    setIsThemeSettingsOpen(true);
  }

  function handleApplyThemeSettings() {
    const normalizedThemes = themeLibraryDraft.map((theme) => ({
      ...theme,
      name: String(theme.name ?? "").trim() || "Untitled Theme",
      settings: normalizeThemeSettings(theme.settings)
    }));
    const activeTheme =
      normalizedThemes.find((theme) => theme.id === selectedThemeDraftId) ?? normalizedThemes[0] ?? null;

    setModel((current) => ({
      ...current,
      project: {
        ...current.project,
        activeThemeId: activeTheme?.id ?? DEFAULT_THEME_ID,
        themes: normalizedThemes,
        theme: normalizeThemeSettings(activeTheme?.settings)
      }
    }));
    setIsThemeSettingsOpen(false);
    setStatus(`Applied theme settings${activeTheme?.name ? `: ${activeTheme.name}` : ""}.`);
  }

  function handleResetThemeSettings() {
    setThemeLibraryDraft((current) =>
      current.map((theme) =>
        theme.id === selectedThemeDraftId
          ? {
              ...theme,
              settings: { ...DEFAULT_THEME_SETTINGS }
            }
          : theme
      )
    );
  }

  function handleCancelThemeSettings() {
    const normalizedThemeLibrary = normalizeThemeLibrary(model.project);
    setThemeLibraryDraft(normalizedThemeLibrary.themes);
    setSelectedThemeDraftId(normalizedThemeLibrary.activeThemeId);
    setIsThemeSettingsOpen(false);
  }

  function handleAddSchema() {
    const nextIndex = (model.project?.schemas?.length ?? 0) + 1;
    const schemaId = `schema-${Date.now()}`;
    const newSchema = {
      id: schemaId,
      name: `schema_${nextIndex}`,
      comment: ""
    };

    setModel((current) => ({
      ...current,
      project: {
        ...current.project,
        schemas: [...(current.project?.schemas ?? []), newSchema]
      }
    }));
    setStatus("Added a new schema.");
    return schemaId;
  }

  function handleSchemaChange(schemaId, field, value) {
    setModel((current) => ({
      ...current,
      project: {
        ...current.project,
        schemas: (current.project?.schemas ?? []).map((schema) =>
          schema.id === schemaId
            ? {
                ...schema,
                [field]: value
              }
            : schema
        )
      }
    }));
  }

  function handleDeleteSchema(schemaId) {
    setModel((current) => ({
      ...current,
      project: {
        ...current.project,
        schemas: (current.project?.schemas ?? []).filter((schema) => schema.id !== schemaId)
      }
    }));
    setStatus("Deleted schema.");
  }

  function handleAiModelerChange(field, value) {
    const shouldResetValidation = [
      "engine",
      "endpoint",
      "apiKey",
      "apiVersion",
      "deployment"
    ].includes(field);

    setAiModeler((current) => {
      const currentProfileKey = current.engine === "OpenAI" ? "openAi" : "azureOpenAi";
      const nextProfileKey = field === "engine" && value === "OpenAI" ? "openAi" : field === "engine" ? "azureOpenAi" : currentProfileKey;
      const nextState = {
        ...current,
        [field]: value
      };

      if (field !== "schemaDescription" && field !== "engine" && ["endpoint", "apiKey", "apiVersion", "deployment"].includes(field)) {
        nextState[currentProfileKey] = {
          ...(current[currentProfileKey] ?? {}),
          [field]: value
        };
      }

      if (field === "engine") {
        nextState[currentProfileKey] = {
          ...(current[currentProfileKey] ?? {}),
          endpoint: current.engine === "Azure OpenAI" ? current.endpoint : current[currentProfileKey]?.endpoint,
          apiKey: current.apiKey,
          apiVersion: current.engine === "Azure OpenAI" ? current.apiVersion : current[currentProfileKey]?.apiVersion,
          deployment: current.deployment,
          validationMessage: current.validationMessage,
          validationStatus: current.validationStatus
        };
      }

      if (shouldResetValidation) {
        nextState.isValidating = false;
        nextState.validationMessage = "";
        nextState.validationStatus = "idle";
        nextState[nextProfileKey] = {
          ...(nextState[nextProfileKey] ?? {}),
          validationMessage: "",
          validationStatus: "idle"
        };
      }

      return normalizeAiModelerSettings(nextState);
    });
  }

  function handleToggleAiKeyVisibility() {
    setAiModeler((current) => ({
      ...current,
      isKeyVisible: !current.isKeyVisible
    }));
  }

  async function handleValidateAiSettings() {
    const engineLabel = aiModeler.engine === "OpenAI" ? "OpenAI" : "Azure OpenAI";
    const payload = {
      engine: aiModeler.engine,
      endpoint: aiModeler.endpoint,
      apiKey: aiModeler.apiKey,
      apiVersion: aiModeler.apiVersion,
      deployment: aiModeler.deployment
    };

    setAiModeler((current) => ({
      ...current,
      isValidating: true,
      validationMessage: "",
      validationStatus: "idle"
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/ai/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.detail || result?.message || `Validation failed with ${response.status}`);
      }

      const successMessage = result?.message || `${engineLabel} settings validated successfully.`;
      setAiModeler((current) => ({
        ...current,
        isValidating: false,
        validationMessage: successMessage,
        validationStatus: "success",
        [current.engine === "OpenAI" ? "openAi" : "azureOpenAi"]: {
          ...(current[current.engine === "OpenAI" ? "openAi" : "azureOpenAi"] ?? {}),
          endpoint: current.engine === "Azure OpenAI" ? current.endpoint : current[current.engine === "OpenAI" ? "openAi" : "azureOpenAi"]?.endpoint,
          apiKey: current.apiKey,
          apiVersion: current.engine === "Azure OpenAI" ? current.apiVersion : current[current.engine === "OpenAI" ? "openAi" : "azureOpenAi"]?.apiVersion,
          deployment: current.deployment,
          validationMessage: successMessage,
          validationStatus: "success"
        }
      }));
      setStatus(successMessage);
    } catch (error) {
      const failureMessage = buildBackendFetchFailureMessage(
        `${engineLabel} validation`,
        error
      );
      setAiModeler((current) => ({
        ...current,
        isValidating: false,
        validationMessage: failureMessage,
        validationStatus: "error",
        [current.engine === "OpenAI" ? "openAi" : "azureOpenAi"]: {
          ...(current[current.engine === "OpenAI" ? "openAi" : "azureOpenAi"] ?? {}),
          validationMessage: failureMessage,
          validationStatus: "error"
        }
      }));
      setStatus(failureMessage);
    }
  }

  async function handleAiGenerate() {
    const prompt = aiModeler.schemaDescription.trim();
    if (!prompt) {
      setStatus("Enter a schema description before generating.");
      return;
    }

    setAiLoading(true);
    setAiActiveTask("generate");
    setAiStartedAt(Date.now());
    setStatus("Generating AI model...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          engine: aiModeler.engine,
          endpoint: aiModeler.endpoint,
          apiKey: aiModeler.apiKey,
          apiVersion: aiModeler.apiVersion,
          deployment: aiModeler.deployment,
          prompt,
          database: model.project.database,
          databaseVersion: model.project.databaseVersion
        })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "AI generation failed."));
      }

      const result = await response.json().catch(() => null);
      const modelJson = String(result?.modelJson ?? "").trim();

      if (!modelJson) {
        throw new Error("AI returned no model JSON.");
      }

      importJsonText(modelJson, "AI generation");
      setStatus(result?.message || "AI model generated.");
    } catch (error) {
      setStatus(`AI generation failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setAiLoading(false);
      setAiActiveTask("");
      setAiStartedAt(0);
    }
  }

  function flattenFieldsForAi(fields, entityId, parentAttributeId = "", depth = 0) {
    return (fields ?? []).flatMap((field) => {
      const current = {
        entityId: String(entityId),
        attributeId: String(field.id ?? ""),
        name: String(field.name ?? ""),
        physicalName: String(field.physicalName ?? ""),
        dataType: String(field.dataType ?? ""),
        comment: String(field.comment ?? ""),
        definition: String(field.definition ?? ""),
        parentAttributeId: parentAttributeId || "",
        depth
      };

      const children = flattenFieldsForAi(field.children ?? [], entityId, String(field.id ?? ""), depth + 1);
      return [current, ...children];
    });
  }

  function applyAiAttributeDocs(fields, entityId, attributeCommentMap) {
    return (fields ?? []).map((field) => {
      const key = `${String(entityId)}::${String(field.id ?? "")}`;
      const aiDoc = attributeCommentMap.get(key);
      const hasComment = String(field.comment ?? "").trim().length > 0;
      const hasDefinition = String(field.definition ?? "").trim().length > 0;

      return {
        ...field,
        comment: hasComment || !aiDoc ? field.comment : aiDoc.comment,
        definition: hasDefinition || !aiDoc ? field.definition : aiDoc.definition,
        ...(field.children?.length
          ? {
              children: applyAiAttributeDocs(field.children, entityId, attributeCommentMap)
            }
          : {})
      };
    });
  }

  async function handleAiGenerateComments() {
    const commentableEntities = (activeDiagram?.entities ?? []).filter((entity) => {
      const objectType = getEntityObjectType(entity);
      return objectType === "entity" || objectType === "view" || objectType === "materializedView";
    });

    if (commentableEntities.length === 0) {
      setStatus("No entities, views, or materialized views are available for AI documentation.");
      return;
    }

    setAiLoading(true);
    setAiActiveTask("comments");
    setAiStartedAt(Date.now());
    setStatus("Generating AI documentation comments...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/ai/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          engine: aiModeler.engine,
          endpoint: aiModeler.endpoint,
          apiKey: aiModeler.apiKey,
          apiVersion: aiModeler.apiVersion,
          deployment: aiModeler.deployment,
          database: model.project.database,
          databaseVersion: model.project.databaseVersion,
          schemaDescription: aiModeler.schemaDescription,
          entities: commentableEntities.map((entity) => ({
            id: String(entity.id),
            objectType: getEntityObjectType(entity),
            name: String(entity.name ?? ""),
            physicalName: String(entity.physicalName ?? ""),
            comment: String(entity.comment ?? ""),
            definition: String(entity.definition ?? ""),
            attributes: flattenFieldsForAi(entity.fields ?? [], entity.id)
          }))
        })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "AI comments generation failed."));
      }

      const result = await response.json().catch(() => null);
      const entityCommentMap = new Map(
        (result?.entityComments ?? []).map((item) => [
          String(item.id ?? ""),
          {
            comment: String(item.comment ?? ""),
            definition: String(item.definition ?? "")
          }
        ])
      );
      const attributeCommentMap = new Map(
        (result?.attributeComments ?? []).map((item) => [
          `${String(item.entityId ?? "")}::${String(item.attributeId ?? "")}`,
          {
            comment: String(item.comment ?? ""),
            definition: String(item.definition ?? "")
          }
        ])
      );

      setModel((current) => ({
        ...current,
        diagrams: current.diagrams.map((diagram) => {
          if (diagram.id !== activeDiagram?.id) {
            return diagram;
          }

          return {
            ...diagram,
            entities: (diagram.entities ?? []).map((entity) => {
              const objectType = getEntityObjectType(entity);
              if (!(objectType === "entity" || objectType === "view" || objectType === "materializedView")) {
                return entity;
              }

              const aiEntityDoc = entityCommentMap.get(String(entity.id));
              const hasComment = String(entity.comment ?? "").trim().length > 0;
              const hasDefinition = String(entity.definition ?? "").trim().length > 0;

              return {
                ...entity,
                comment: hasComment || !aiEntityDoc ? entity.comment : aiEntityDoc.comment,
                definition: hasDefinition || !aiEntityDoc ? entity.definition : aiEntityDoc.definition,
                fields: applyAiAttributeDocs(entity.fields ?? [], entity.id, attributeCommentMap)
              };
            })
          };
        })
      }));

      setStatus(result?.message || "AI documentation generated.");
    } catch (error) {
      setStatus(`AI comments generation failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setAiLoading(false);
      setAiActiveTask("");
      setAiStartedAt(0);
    }
  }

  function handleAiSummary() {
    setSummarySubjectAreaId(summarySubjectAreas[0]?.id ?? "model");
    setIsSummaryOpen(true);
    setStatus("Opened AI summary.");
  }

  function toggleSummaryDeterministicExpansion(id) {
    setSummaryDetExpanded((current) => ({
      ...current,
      [id]: !current[id]
    }));
  }

  async function handleGenerateSummaryInsights() {
    setSummaryInsightsLoading(true);
    setStatus("Generating AI summary insights...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/ai/summary-insights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          engine: aiModeler.engine,
          endpoint: aiModeler.endpoint,
          apiKey: aiModeler.apiKey,
          apiVersion: aiModeler.apiVersion,
          deployment: aiModeler.deployment,
          database: model.project.database,
          databaseVersion: model.project.databaseVersion,
          subjectAreaName: summarySubjectAreaName,
          summaryStats,
          deterministic: summaryDeterministic.map((item) => ({
            id: item.id,
            text: item.text,
            details: item.details ?? []
          }))
        })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "AI summary generation failed."));
      }

      const result = await response.json().catch(() => null);
      setSummaryInsightsCache((current) => ({
        ...current,
        [summarySubjectAreaId]: {
          aiSummary: String(result?.aiSummary ?? ""),
          aiRecommendations: Array.isArray(result?.aiRecommendations)
            ? result.aiRecommendations.map((item) => String(item))
            : []
        }
      }));
      setStatus("Generated AI summary insights.");
    } catch (error) {
      setStatus(`AI summary generation failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setSummaryInsightsLoading(false);
    }
  }

  async function handleAiTuning() {
    setAiLoading(true);
    setAiActiveTask("tuning");
    setAiStartedAt(Date.now());
    setStatus("AI tuning scan started...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/ai/tuning`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          engine: aiModeler.engine,
          endpoint: aiModeler.endpoint,
          apiKey: aiModeler.apiKey,
          apiVersion: aiModeler.apiVersion,
          deployment: aiModeler.deployment,
          database: model.project.database,
          databaseVersion: model.project.databaseVersion,
          objects: buildAiTuningObjects(model, summaryScope)
        })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "AI tuning scan failed."));
      }

      const result = await response.json().catch(() => null);
      const findings = Array.isArray(result?.findings)
        ? result.findings.map((item, index) => ({
            rowKey: `${String(item.key ?? `${item.objectType}:${item.objectId}`)}::${index}`,
            key: String(item.key ?? `${item.objectType}:${item.objectId}`),
            objectType: String(item.objectType ?? ""),
            objectId: String(item.objectId ?? ""),
            label: String(item.label ?? ""),
            errorCount: Number(item.errorCount ?? 0),
            issues: Array.isArray(item.issues) ? item.issues.map((issue) => String(issue)) : [],
            patch: {
              name: String(item.patch?.name ?? ""),
              physicalName: String(item.patch?.physicalName ?? ""),
              definition: String(item.patch?.definition ?? ""),
              comment: String(item.patch?.comment ?? ""),
              datatype: String(item.patch?.datatype ?? ""),
              description: String(item.patch?.description ?? "")
            }
          }))
        : [];

      if (findings.length === 0) {
        setAiTuningFindings([]);
        setSelectedAiTuningKeys([]);
        setStatus("AI tuning found no issues.");
        return;
      }

      setAiTuningFindings(findings);
      setSelectedAiTuningKeys(findings.map((item) => item.rowKey));
      setIsAiTuningOpen(true);
      setStatus(`AI tuning found ${findings.length} objects with issues.`);
    } catch (error) {
      setStatus(`AI tuning scan failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setAiLoading(false);
      setAiActiveTask("");
      setAiStartedAt(0);
    }
  }

  function applyAiTuningSelected() {
    const selectedSet = new Set(selectedAiTuningKeys);
    const selectedFindings = aiTuningFindings.filter((item) => selectedSet.has(item.rowKey));

    if (selectedFindings.length === 0) {
      setIsAiTuningOpen(false);
      return;
    }

    const projectPatch = new Map();
    const diagramPatch = new Map();
    const entityPatch = new Map();
    const attributePatch = new Map();
    const indexPatch = new Map();
    const relationshipPatch = new Map();
    const schemaPatch = new Map();

    selectedFindings.forEach((item) => {
      if (item.objectType === "subjectArea") {
        projectPatch.set(item.objectId, item.patch);
      } else if (item.objectType === "diagram") {
        diagramPatch.set(item.objectId, item.patch);
      } else if (["entity", "view", "materializedView"].includes(item.objectType)) {
        entityPatch.set(item.objectId, item.patch);
      } else if (item.objectType === "attribute") {
        attributePatch.set(item.objectId, item.patch);
      } else if (item.objectType === "index") {
        indexPatch.set(item.objectId, item.patch);
      } else if (item.objectType === "relationship") {
        relationshipPatch.set(item.objectId, item.patch);
      } else if (item.objectType === "schema") {
        schemaPatch.set(item.objectId, item.patch);
      }
    });

    const patchFieldTree = (fields) =>
      mapFieldTree(fields, (field) => {
        const patch = attributePatch.get(String(field.id));
        return patch
          ? {
              ...field,
              ...(patch.name ? { name: patch.name } : {}),
              ...(patch.physicalName ? { physicalName: patch.physicalName } : {}),
              ...(patch.definition ? { definition: patch.definition } : {}),
              ...(patch.comment ? { comment: patch.comment } : {}),
              ...(patch.datatype ? { dataType: normalizeDatatypeCase(patch.datatype) } : {})
            }
          : field;
      });

    setModel((current) => ({
      ...current,
      project: {
        ...current.project,
        ...(projectPatch.get("model")?.name && current.project.subjectArea !== "<model>"
          ? { subjectArea: projectPatch.get("model").name }
          : {}),
        ...(projectPatch.get("model")?.definition ? { definition: projectPatch.get("model").definition } : {}),
        schemas: (current.project?.schemas ?? []).map((schema) => {
          const patch = schemaPatch.get(String(schema.id));
          return patch
            ? {
                ...schema,
                ...(patch.name ? { name: patch.name } : {}),
                ...(patch.comment ? { comment: patch.comment } : {})
              }
            : schema;
        })
      },
      diagrams: current.diagrams.map((diagram) => {
        const dPatch = diagramPatch.get(String(diagram.id));
        return {
          ...diagram,
          ...(dPatch?.name ? { name: dPatch.name } : {}),
          ...(dPatch?.definition ? { definition: dPatch.definition } : {}),
          entities: (diagram.entities ?? []).map((entity) => {
            const ePatch = entityPatch.get(String(entity.id));
            return {
              ...entity,
              ...(ePatch?.name ? { name: ePatch.name } : {}),
              ...(ePatch?.physicalName ? { physicalName: ePatch.physicalName } : {}),
              ...(ePatch?.definition ? { definition: ePatch.definition } : {}),
              ...(ePatch?.comment ? { comment: ePatch.comment } : {}),
              fields: patchFieldTree(entity.fields ?? []),
              indexes: (entity.indexes ?? []).map((index) => {
                const idxPatch = indexPatch.get(String(index.id));
                return idxPatch
                  ? {
                      ...index,
                      ...(idxPatch.name ? { name: idxPatch.name } : {}),
                      ...(idxPatch.physicalName ? { physicalName: idxPatch.physicalName } : {}),
                      ...(idxPatch.definition ? { definition: idxPatch.definition } : {}),
                      ...(idxPatch.comment ? { comment: idxPatch.comment } : {})
                    }
                  : index;
              })
            };
          }),
          relationships: (diagram.relationships ?? []).map((relationship) => {
            const patch = relationshipPatch.get(String(relationship.id));
            return patch
              ? {
                  ...relationship,
                  ...(patch.name ? { name: patch.name } : {}),
                  ...(patch.physicalName ? { physicalName: patch.physicalName } : {}),
                  ...(patch.definition ? { definition: patch.definition } : {}),
                  ...(patch.comment ? { comment: patch.comment } : {}),
                  ...(patch.description ? { description: patch.description } : {})
                }
              : relationship;
          })
        };
      })
    }));

    setIsAiTuningOpen(false);
    setAiTuningFindings([]);
    setSelectedAiTuningKeys([]);
    setStatus(`AI tuning applied to ${selectedFindings.length} objects.`);
  }

  function handleExportJson() {
    const exportedJson = JSON.stringify(exportModelToWorkspaceJson(model), null, 2);
    setJsonDraft(exportedJson);
    setStatus("Exported the current model to the JSON box.");
  }

  function handleViewJson() {
    const exportedJson = JSON.stringify(exportModelToWorkspaceJson(model), null, 2);
    setJsonDraft(exportedJson);
    setIsJsonViewerOpen(true);
    setStatus("Opened the model JSON viewer.");
  }

  function importJsonText(jsonText, sourceLabel = "JSON") {
    const parsed = JSON.parse(jsonText);
    const importedModel = normalizeModel(parsed);
    const importedActiveDiagram =
      importedModel.diagrams.find((diagram) => diagram.id === importedModel.activeDiagramId) ??
      importedModel.diagrams[0];
    const relaidOutModel = {
      ...importedModel,
      diagrams: importedModel.diagrams.map((diagram) =>
        diagram.id === importedModel.activeDiagramId
          ? autoLayoutDiagramForProject(diagram, importedModel.project)
          : diagram
      )
    };
    const relaidOutActiveDiagram =
      relaidOutModel.diagrams.find((diagram) => diagram.id === relaidOutModel.activeDiagramId) ??
      relaidOutModel.diagrams[0];
    setJsonDraft(jsonText);
    setModel(relaidOutModel);
    setSelectedEntityIds(relaidOutActiveDiagram?.entities[0]?.id ? [relaidOutActiveDiagram.entities[0].id] : []);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(relaidOutModel));
    setViewResetToken((current) => current + 1);
    setStatus(`Imported model JSON from ${sourceLabel}.`);
  }

  async function handleCopyJson() {
    const contentToCopy = JSON.stringify(exportModelToWorkspaceJson(model), null, 2);

    try {
      await navigator.clipboard.writeText(contentToCopy);
      setJsonDraft(contentToCopy);
      setStatus("Copied model JSON to the clipboard.");
    } catch {
      setStatus("Copy failed. Your browser blocked clipboard access.");
    }
  }

  async function handleSaveJsonToFile() {
    const contentToSave = JSON.stringify(exportModelToWorkspaceJson(model), null, 2);
    const suggestedName = `${activeDiagram?.name ?? "ER_Diagram_1"}.json`;

    try {
      if (window.isSecureContext && typeof window.showSaveFilePicker === "function") {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: "JSON Files",
              accept: {
                "application/json": [".json"]
              }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(contentToSave);
        await writable.close();
        setJsonDraft(contentToSave);
        setStatus("Saved model JSON to a file.");
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("Save cancelled.");
        return;
      }

      setStatus(`Save dialog failed, falling back to download. ${error instanceof Error ? error.message : ""}`.trim());
    }

    const blob = new Blob([contentToSave], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = suggestedName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setJsonDraft(contentToSave);
    setStatus("Downloaded model JSON.");
  }

  async function handleOpenJsonFile() {
    try {
      if (window.isSecureContext && typeof window.showOpenFilePicker === "function") {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: "JSON Files",
              accept: {
                "application/json": [".json"]
              }
            },
            {
              description: "Erwin JSON Files",
              accept: {
                "text/plain": [".erwin_json"]
              }
            }
          ]
        });

        if (!handle) {
          return;
        }

        const file = await handle.getFile();
        const text = await file.text();
        importJsonText(text, "an opened file");
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("Open cancelled.");
        return;
      }
    }

    jsonFileInputRef.current?.click();
  }

  function handleClearJson() {
    setJsonDraft("");
    setStatus("Cleared the JSON box.");
  }

  function handleImportJson() {
    if (!jsonDraft.trim()) {
      setStatus("Paste model JSON into the JSON box before importing.");
      return;
    }

    try {
      importJsonText(jsonDraft, "the JSON box");
    } catch (error) {
      setStatus(`Import failed: ${error instanceof Error ? error.message : "Invalid JSON."}`);
    }
  }

  async function handleJsonFileInputChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      importJsonText(text, file.name);
    } catch (error) {
      setStatus(`Open failed: ${error instanceof Error ? error.message : "Unable to read the file."}`);
    } finally {
      event.target.value = "";
    }
  }

  function handleAutoLayout() {
    if (!activeDiagram) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: buildAutoLayout(diagram.entities, diagram.relationships, diagramViewport)
            }
          : diagram
      )
    }));
    setViewResetToken((current) => current + 1);
    setStatus("Re-laid out entities to fit the current diagram view.");
  }

  function handleZoomIn() {
    setZoom((current) => {
      const nextZoom = Math.min(MAX_ZOOM, Number((current + ZOOM_STEP).toFixed(2)));
      setStatus(`Zoomed in to ${Math.round(nextZoom * 100)}%.`);
      return nextZoom;
    });
  }

  function handleZoomOut() {
    setZoom((current) => {
      const nextZoom = Math.max(MIN_ZOOM, Number((current - ZOOM_STEP).toFixed(2)));
      setStatus(`Zoomed out to ${Math.round(nextZoom * 100)}%.`);
      return nextZoom;
    });
  }

  function handleRelationshipChange(field, value) {
    if (!selectedRelationshipId) {
      return;
    }

    const sourceEntity = activeDiagram?.entities.find(
      (entity) => entity.id === selectedRelationship?.sourceEntityId
    );
    const targetEntity = activeDiagram?.entities.find(
      (entity) => entity.id === selectedRelationship?.targetEntityId
    );
    const derivedOnly = isViewLikeEntity(sourceEntity) || isViewLikeEntity(targetEntity);

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              relationships: diagram.relationships.map((relationship) =>
                relationship.id === selectedRelationshipId
                  ? {
                      ...relationship,
                      [field]: field === "relationshipType"
                        ? derivedOnly
                          ? "Derived"
                          : normalizeRelationshipType(value)
                        : value
                    }
                  : relationship
              )
            }
          : diagram
      )
    }));
  }

  function handleSelectRelationship(relationshipId) {
    setSelectedRelationshipId(relationshipId);
    setSelectedEntityIds([]);
    setSelectedAttributeId(null);
    setLinkDraft(null);
  }

  function handleMoveRelationship(relationshipId, lineOffsetX, lineOffsetY) {
    if (!relationshipId) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              relationships: diagram.relationships.map((relationship) =>
                relationship.id === relationshipId
                  ? {
                      ...relationship,
                      props: {
                        ...(relationship.props ?? {}),
                        lineOffsetX: Math.round(lineOffsetX),
                        lineOffsetY: Math.round(lineOffsetY)
                      }
                    }
                  : relationship
              )
            }
          : diagram
      )
    }));
  }

  function handleMoveRelationshipEndpoint(relationshipId, endpoint, attachment) {
    if (!relationshipId || !endpoint || !attachment) {
      return;
    }

    const attachmentKey = endpoint === "source" ? "sourceAttachment" : "targetAttachment";

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              relationships: diagram.relationships.map((relationship) =>
                relationship.id === relationshipId
                  ? {
                      ...relationship,
                      props: {
                        ...(relationship.props ?? {}),
                        [attachmentKey]: {
                          side: attachment.side,
                          t: Number(attachment.t)
                        }
                      }
                    }
                  : relationship
              )
            }
          : diagram
      )
    }));
  }

  function handleInsertRelationshipBendPoint(relationshipId, index, point) {
    if (!relationshipId || !point) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              relationships: diagram.relationships.map((relationship) => {
                if (relationship.id !== relationshipId) {
                  return relationship;
                }

                const bendPoints = Array.isArray(relationship?.props?.bendPoints)
                  ? relationship.props.bendPoints.map((item) => ({
                      x: Number(item?.x),
                      y: Number(item?.y)
                    }))
                  : [];
                const nextBendPoints = [...bendPoints];
                nextBendPoints.splice(index, 0, {
                  x: Math.round(point.x),
                  y: Math.round(point.y)
                });

                return {
                  ...relationship,
                  props: {
                    ...(relationship.props ?? {}),
                    bendPoints: nextBendPoints
                  }
                };
              })
            }
          : diagram
      )
    }));
  }

  function handleMoveRelationshipBendPoint(relationshipId, index, point) {
    if (!relationshipId || !point) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              relationships: diagram.relationships.map((relationship) => {
                if (relationship.id !== relationshipId) {
                  return relationship;
                }

                const bendPoints = Array.isArray(relationship?.props?.bendPoints)
                  ? relationship.props.bendPoints.map((item) => ({
                      x: Number(item?.x),
                      y: Number(item?.y)
                    }))
                  : [];
                if (!bendPoints[index]) {
                  return relationship;
                }

                bendPoints[index] = {
                  x: Math.round(point.x),
                  y: Math.round(point.y)
                };

                return {
                  ...relationship,
                  props: {
                    ...(relationship.props ?? {}),
                    bendPoints
                  }
                };
              })
            }
          : diagram
      )
    }));
  }

  function handleRemoveRelationshipBendPoint(relationshipId, index) {
    if (!relationshipId) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              relationships: diagram.relationships.map((relationship) => {
                if (relationship.id !== relationshipId) {
                  return relationship;
                }

                const bendPoints = Array.isArray(relationship?.props?.bendPoints)
                  ? relationship.props.bendPoints.filter((_, bendIndex) => bendIndex !== index)
                  : [];

                return {
                  ...relationship,
                  props: {
                    ...(relationship.props ?? {}),
                    bendPoints
                  }
                };
              })
            }
          : diagram
      )
    }));
  }

  function handleMoveDrawingLine(entityId, lineOffsetX, lineOffsetY) {
    if (!entityId) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) =>
                entity.id === entityId
                  ? {
                      ...entity,
                      lineOffsetX: Math.round(lineOffsetX),
                      lineOffsetY: Math.round(lineOffsetY)
                    }
                  : entity
              )
            }
          : diagram
      )
    }));
  }

  function handleInsertDrawingLineBendPoint(entityId, index, point) {
    if (!entityId || !point) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) => {
                if (entity.id !== entityId) {
                  return entity;
                }

                const bendPoints = Array.isArray(entity.lineBendPoints)
                  ? entity.lineBendPoints.map((item) => ({
                      x: Number(item?.x),
                      y: Number(item?.y)
                    }))
                  : [];
                const nextBendPoints = [...bendPoints];
                nextBendPoints.splice(index, 0, {
                  x: Math.round(point.x),
                  y: Math.round(point.y)
                });

                return {
                  ...entity,
                  lineBendPoints: nextBendPoints
                };
              })
            }
          : diagram
      )
    }));
  }

  function handleMoveDrawingLineBendPoint(entityId, index, point) {
    if (!entityId || !point) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) => {
                if (entity.id !== entityId) {
                  return entity;
                }

                const bendPoints = Array.isArray(entity.lineBendPoints)
                  ? entity.lineBendPoints.map((item) => ({
                      x: Number(item?.x),
                      y: Number(item?.y)
                    }))
                  : [];
                if (!bendPoints[index]) {
                  return entity;
                }

                bendPoints[index] = {
                  x: Math.round(point.x),
                  y: Math.round(point.y)
                };

                return {
                  ...entity,
                  lineBendPoints: bendPoints
                };
              })
            }
          : diagram
      )
    }));
  }

  function handleRemoveDrawingLineBendPoint(entityId, index) {
    if (!entityId) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) =>
                entity.id === entityId
                  ? {
                      ...entity,
                      lineBendPoints: (entity.lineBendPoints ?? []).filter((_, bendIndex) => bendIndex !== index)
                    }
                  : entity
              )
            }
          : diagram
      )
    }));
  }

  function handleMoveDrawingLineEndpoint(entityId, endpoint, attachment) {
    if (!entityId || !endpoint || !attachment) {
      return;
    }

    const attachmentKey = endpoint === "source" ? "lineSourceAttachment" : "lineTargetAttachment";

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) =>
                entity.id === entityId
                  ? {
                      ...entity,
                      [attachmentKey]: {
                        side: attachment.side,
                        t: Number(attachment.t)
                      }
                    }
                  : entity
              )
            }
          : diagram
      )
    }));
  }

  function handleSetSelectedEntities(entityIds) {
    setSelectedEntityIds(entityIds);
    if (entityIds.length !== 1) {
      setSelectedAttributeId(null);
    }
  }

  function handleSelectEntity(entityId, options = {}) {
    const { additive = false, toggle = false } = options;

    if (!linkDraft) {
      setSelectedEntityIds((current) => {
        if (!entityId) {
          return [];
        }

        if (toggle) {
          return current.includes(entityId)
            ? current.filter((id) => id !== entityId)
            : [...current, entityId];
        }

        if (additive) {
          return current.includes(entityId) ? current : [...current, entityId];
        }

        return [entityId];
      });
      setSelectedRelationshipId(null);
      return;
    }

    if (!activeDiagram) {
      return;
    }

    if (!linkDraft.sourceEntityId) {
      setLinkDraft((current) => ({ ...(current ?? {}), sourceEntityId: entityId }));
      setSelectedEntityIds(entityId ? [entityId] : []);
      setSelectedAttributeId(null);
      setSelectedRelationshipId(null);
      setStatus("Select the second entity to create a relationship.");
      return;
    }

    if (linkDraft.sourceEntityId === entityId) {
      setStatus("Choose a different target entity.");
      return;
    }

    const source = activeDiagram.entities.find((entity) => entity.id === linkDraft.sourceEntityId);
    const target = activeDiagram.entities.find((entity) => entity.id === entityId);
    const sourceIsViewLike = isViewLikeEntity(source);
    const targetIsViewLike = isViewLikeEntity(target);
    const requestedRelationshipType = normalizeRelationshipType(
      linkDraft.relationshipType ?? "Non-Identifying"
    );

    if (requestedRelationshipType === "Connector") {
      const lineId = getNextNumericWorkspaceId(model);
      const sourceCenterX = (source?.x ?? 0) + ((source?.width ?? 140) / 2);
      const sourceCenterY = (source?.y ?? 0) + ((source?.height ?? 100) / 2);
      const targetCenterX = (target?.x ?? 0) + ((target?.width ?? 140) / 2);
      const targetCenterY = (target?.y ?? 0) + ((target?.height ?? 100) / 2);
      const newLine = {
        id: lineId,
        name: `Shape_${lineId}`,
        physicalName: `Shape_${lineId}`,
        objectType: "drawing",
        physicalOnly: false,
        drawingShape: "line",
        drawingText: "",
        lineSourceId: linkDraft.sourceEntityId,
        lineTargetId: entityId,
        lineOffsetX: 0,
        lineOffsetY: 0,
        x: Math.min(sourceCenterX, targetCenterX),
        y: Math.min(sourceCenterY, targetCenterY),
        width: Math.max(24, Math.abs(targetCenterX - sourceCenterX)),
        height: Math.max(24, Math.abs(targetCenterY - sourceCenterY)),
        fields: []
      };

      setModel((current) => ({
        ...current,
        diagrams: current.diagrams.map((diagram) =>
          diagram.id === current.activeDiagramId
            ? {
                ...diagram,
                entities: [...diagram.entities, newLine]
              }
            : diagram
        )
      }));

      setLinkDraft(null);
      setSelectedEntityIds([lineId]);
      setSelectedAttributeId(null);
      setSelectedRelationshipId(null);
      setStatus(`Created drawing line ${newLine.name}.`);
      return;
    }

    if (requestedRelationshipType === "Subtype" && (sourceIsViewLike || targetIsViewLike)) {
      setStatus("Sub-Category relationships are only allowed between entities.");
      return;
    }

    if (requestedRelationshipType === "Derived" && !targetIsViewLike) {
      setStatus("View/Materized Rel. requires the target to be a view or materialized view.");
      return;
    }

    if (sourceIsViewLike && targetIsViewLike) {
      setStatus("View-to-view and materialized-view-to-view relationships are not allowed. Parent must be an entity.");
      return;
    }

    const derivedOnly = sourceIsViewLike || targetIsViewLike;
    const resolvedRelationshipType = requestedRelationshipType === "Subtype"
      ? "Subtype"
      : derivedOnly
        ? "Derived"
        : requestedRelationshipType;
    const relationshipId = `relationship-${Date.now()}`;
    const newRelationship = normalizeRelationship({
      id: relationshipId,
      sourceEntityId: linkDraft.sourceEntityId,
      targetEntityId: entityId,
      name: `${source?.physicalName ?? "Entity"} -> ${target?.physicalName ?? "Entity"}`,
      physicalName: `${linkDraft.sourceEntityId}-${entityId}`,
      description: "relates_to",
      cardinality: resolvedRelationshipType === "Subtype" ? "" : "1:N",
      style: ["Non-Identifying", "Derived", "ManyToMany"].includes(resolvedRelationshipType) ? "dashed" : "solid",
      relationshipType: resolvedRelationshipType
    });

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              relationships: [...diagram.relationships, newRelationship]
            }
          : diagram
      )
    }));

    setLinkDraft(null);
    setSelectedEntityIds([]);
    setSelectedAttributeId(null);
    setSelectedRelationshipId(relationshipId);
    setStatus(`Created relationship ${newRelationship.name}.`);
  }

  function handleSelectAttribute(attributeId, entityId = selectedEntityId) {
    if (!entityId) {
      return;
    }

    setSelectedEntityIds([entityId]);
    setSelectedRelationshipId(null);
    setSelectedAttributeId(attributeId);
  }

  function handleEditEntity(entityId) {
    if (!entityId) {
      return;
    }

    setSelectedEntityIds([entityId]);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setStatus("Opened entity details.");
  }

  function handleGoToEntity(entityId) {
    if (!entityId) {
      return;
    }

    setSelectedEntityIds([entityId]);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setFocusEntityRequest({
      entityId,
      nonce: Date.now()
    });
    setStatus("Focused the selected entity in the diagram.");
  }

  function handleEditRelationship(relationshipId) {
    if (!relationshipId) {
      return;
    }

    setSelectedRelationshipId(relationshipId);
    setSelectedEntityIds([]);
    setSelectedAttributeId(null);
    setLinkDraft(null);
    setStatus("Opened relationship details.");
  }

  function handleGoToRelationship(relationshipId) {
    if (!relationshipId) {
      return;
    }

    setSelectedRelationshipId(relationshipId);
    setSelectedEntityIds([]);
    setSelectedAttributeId(null);
    setLinkDraft(null);
    setFocusRelationshipRequest({
      relationshipId,
      nonce: Date.now()
    });
    setStatus("Focused the selected relationship in the diagram.");
  }

  function handleStartRelationshipLink(relationshipType = "Non-Identifying") {
    if (!selectedEntityId || selectedEntityIds.length !== 1) {
      setStatus(`Select the first entity, then choose ${relationshipType}.`);
      return;
    }

    const sourceEntity = activeDiagram?.entities.find((entity) => entity.id === selectedEntityId);
    const normalizedRelationshipType = isViewLikeEntity(sourceEntity)
      ? "Derived"
      : normalizeRelationshipType(relationshipType);

    if (normalizedRelationshipType === "Subtype") {
      if (model.project.viewMode !== "Logical View") {
        setStatus("Sub-Category relationships are only available in Logical View.");
        return;
      }

      if (isViewLikeEntity(sourceEntity)) {
        setStatus("Sub-Category relationships can only start from an entity.");
        return;
      }
    }

    setLinkDraft({
      sourceEntityId: selectedEntityId,
      relationshipType: normalizedRelationshipType
    });
    setSelectedRelationshipId(null);
    setStatus(
      `Select the second entity to create a ${normalizedRelationshipType.toLowerCase()} relationship.`
    );
  }

  function handleStartIdentifyingRelationship() {
    handleStartRelationshipLink("Identifying");
  }

  function handleStartNonIdentifyingRelationship() {
    handleStartRelationshipLink("Non-Identifying");
  }

  function handleStartDerivedRelationship() {
    handleStartRelationshipLink("Derived");
  }

  function handleStartSubCategoryRelationship() {
    handleStartRelationshipLink("Subtype");
  }

  function handleStartConnectorRelationship() {
    handleStartRelationshipLink("Connector");
  }

  function updateSelectedEntity(update) {
    if (!selectedEntityId) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) =>
                entity.id === selectedEntityId ? { ...entity, ...update(entity) } : entity
              )
            }
          : diagram
      )
    }));
  }

  function handleEntityChange(field, value, fieldId) {
    updateSelectedEntity((entity) => {
      if (field === "name" || field === "physicalName" || field === "comment") {
        return { [field]: value };
      }

      if (field === "annotationText") {
        return { annotationText: value };
      }

      if (field === "annotationShape") {
        return { annotationShape: value };
      }

      if (field === "drawingText") {
        return { drawingText: value };
      }

      if (field === "drawingShape") {
        return { drawingShape: value };
      }

      if (field === "physicalOnly") {
        return { physicalOnly: value };
      }

      if (field === "logicalOnly") {
        return { logicalOnly: value };
      }

      if (fieldId) {
        return {
          fields: mapFieldTree(entity.fields, (item) =>
            item.id === fieldId
              ? {
                  ...item,
                  ...(field === "fieldName" ? { name: value } : {}),
                  ...(field === "fieldPhysicalName" ? { physicalName: value } : {}),
                  ...(field === "fieldComment" ? { comment: value } : {}),
                  ...(field === "fieldDefinition" ? { definition: value } : {}),
                  ...(field === "fieldType" ? { dataType: normalizeDatatypeCase(value) } : {}),
                  ...(field === "fieldKind"
                    ? {
                        kind: value,
                        isPrimary: value === "PK",
                        isFK: value === "FK"
                      }
                    : {}),
                  ...(field === "fieldPrimary"
                    ? {
                        isPrimary: value === "Yes",
                        kind: value === "Yes" ? "PK" : item.isFK ? "FK" : "COL"
                      }
                    : {}),
                  ...(field === "fieldForeignKey"
                    ? {
                        isFK: value === "Yes",
                        kind: value === "Yes" ? "FK" : item.isPrimary ? "PK" : "COL"
                      }
                    : {}),
                  ...(field === "fieldNullable" ? { isNullable: value === "Yes" } : {}),
                  ...(field === "fieldPhysicalOnly" ? { physicalOnly: value } : {}),
                  ...(field === "fieldLogicalOnly" ? { logicalOnly: value } : {})
                }
              : item
          )
        };
      }

      return {};
    });
  }

  function handleMoveEntity(entityId, x, y) {
    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) =>
                entity.id === entityId ? { ...entity, x, y } : entity
              )
            }
          : diagram
      )
    }));
  }

  function handleMoveEntities(entityIds, updates) {
    const updatesMap = new Map(updates.map((update) => [update.id, update]));

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) => {
                const update = updatesMap.get(entity.id);
                return update ? { ...entity, x: update.x, y: update.y } : entity;
              })
            }
          : diagram
      )
    }));
  }

  function handleResizeEntity(entityId, width, height) {
    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) =>
                entity.id === entityId ? { ...entity, width, height } : entity
              )
            }
          : diagram
      )
    }));
  }

  function handleChangeAnnotationText(entityId, value) {
    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) =>
                entity.id === entityId ? { ...entity, annotationText: value } : entity
              )
            }
          : diagram
      )
    }));
  }

  function handleChangeDrawingText(entityId, value) {
    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) =>
                entity.id === entityId ? { ...entity, drawingText: value } : entity
              )
            }
          : diagram
      )
    }));
  }

  function handleAddEntity() {
    const [entityId, fieldId] = getNextNumericWorkspaceIds(model, 2);
    const newEntity = {
      id: entityId,
      name: "New Entity",
      physicalName: "NewEntity",
      comment: "Describe this entity.",
      physicalOnly: false,
      logicalOnly: false,
      x: 160,
      y: 140,
      width: 280,
      height: 120,
      fields: [
        {
          id: fieldId,
          kind: "PK",
          name: "Id",
          dataType: "uuid"
        }
      ]
    };

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: [...diagram.entities, newEntity]
            }
          : diagram
      )
    }));
    setSelectedEntityIds([entityId]);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setStatus("Created a new entity.");
  }

  function handleAddView() {
    const [entityId, fieldId] = getNextNumericWorkspaceIds(model, 2);
    const newView = {
      id: entityId,
      name: "New View",
      physicalName: "NewView",
      comment: "Describe this view.",
      physicalOnly: false,
      logicalOnly: false,
      objectType: "view",
      x: 180,
      y: 160,
      width: 280,
      height: 120,
      fields: [
        {
          id: fieldId,
          kind: "COL",
          name: "Column1",
          dataType: "varchar(50)"
        }
      ]
    };

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: [...diagram.entities, newView]
            }
          : diagram
      )
    }));
    setSelectedEntityIds([entityId]);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setStatus("Created a new view.");
  }

  function handleAddMaterializedView() {
    const [entityId, fieldId] = getNextNumericWorkspaceIds(model, 2);
    const newMaterializedView = {
      id: entityId,
      name: cachedViewUiName,
      physicalName: String(cachedViewUiName).replace(/\s+/g, ""),
      comment: `Describe this ${cachedViewUiName.toLowerCase()}.`,
      physicalOnly: false,
      logicalOnly: false,
      objectType: "materializedView",
      x: 200,
      y: 180,
      width: 300,
      height: 120,
      fields: [
        {
          id: fieldId,
          kind: "COL",
          name: "Column1",
          dataType: "varchar(50)"
        }
      ]
    };

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: [...diagram.entities, newMaterializedView]
            }
          : diagram
      )
    }));
    setSelectedEntityIds([entityId]);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setStatus(`Created a new ${cachedViewUiName.toLowerCase()}.`);
  }

  function handleAddAnnotation() {
    const [entityId] = getNextNumericWorkspaceIds(model, 1);
    const newAnnotation = {
      id: entityId,
      name: "Annotation",
      physicalName: "Annotation",
      objectType: "annotation",
      annotationShape: "rectangle",
      physicalOnly: false,
      annotationText: "Type annotation",
      x: 220,
      y: 180,
      width: 180,
      height: 92,
      fields: []
    };

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: [...diagram.entities, newAnnotation]
            }
          : diagram
      )
    }));
    setSelectedEntityIds([entityId]);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setStatus("Created a new annotation.");
  }

  function handleAddDrawing(shape = "rectangle") {
    const [entityId] = getNextNumericWorkspaceIds(model, 1);
    const newDrawing = {
      id: entityId,
      name: "Drawing",
      physicalName: "Drawing",
      objectType: "drawing",
      physicalOnly: false,
      drawingShape: shape,
      drawingText: "Drawing",
      x: 260,
      y: 220,
      width: 140,
      height: 110,
      fields: []
    };

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: [...diagram.entities, newDrawing]
            }
          : diagram
      )
    }));
    setSelectedEntityIds([entityId]);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setStatus("Created a new drawing.");
  }

  function handleAddDiagram() {
    const nextNumber =
      model.diagrams.reduce((highest, diagram) => {
        const match = diagram.name.match(/ER_Diagram_(\d+)/);
        return Math.max(highest, match ? Number(match[1]) : 0);
      }, 0) + 1;
    const newDiagram = {
      id: `er-diagram-${Date.now()}`,
      name: `ER_Diagram_${nextNumber}`,
      definition: "",
      displayLevelLogical: getDisplayLevelValueForViewMode("Logical View", getDefaultDisplayLevelForViewMode("Logical View")),
      displayLevelPhysical: getDisplayLevelValueForViewMode("Physical View", getDefaultDisplayLevelForViewMode("Physical View")),
      entities: [],
      relationships: []
    };

    setModel((current) =>
      syncProjectWithActiveDiagram(
        {
          ...current,
          activeDiagramId: newDiagram.id,
          diagrams: [...current.diagrams, newDiagram]
        },
        current.project,
        newDiagram.id
      )
    );
    setSelectedEntityIds([]);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setViewResetToken((current) => current + 1);
    setStatus(`Created ${newDiagram.name}.`);
  }

  function handleSelectDiagram(diagramId) {
    const nextDiagram = model.diagrams.find((diagram) => diagram.id === diagramId);
    if (!nextDiagram) {
      return;
    }

    setModel((current) => {
      const nextModel = syncProjectWithActiveDiagram(current, current.project, diagramId);
      return {
        ...nextModel,
        diagrams: nextModel.diagrams.map((diagram) =>
          diagram.id === diagramId
            ? autoLayoutDiagramForProject(diagram, nextModel.project)
            : diagram
        )
      };
    });
    const relaidOutDiagram = autoLayoutDiagramForProject(nextDiagram, model.project);
    setSelectedEntityIds(relaidOutDiagram.entities[0]?.id ? [relaidOutDiagram.entities[0].id] : []);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setViewResetToken((current) => current + 1);
    setStatus(`Opened ${nextDiagram.name} and applied auto-layout.`);
  }

  function handleCloseDiagram(diagramId) {
    if (model.diagrams.length <= 1) {
      return;
    }

    setModel((current) => {
      const nextDiagrams = current.diagrams.filter((diagram) => diagram.id !== diagramId);
      const nextActiveId =
        current.activeDiagramId === diagramId ? nextDiagrams[0]?.id ?? null : current.activeDiagramId;
      const nextActiveDiagram = nextDiagrams.find((diagram) => diagram.id === nextActiveId);
      setSelectedEntityIds(nextActiveDiagram?.entities[0]?.id ? [nextActiveDiagram.entities[0].id] : []);
      setSelectedRelationshipId(null);
      setLinkDraft(null);
      return syncProjectWithActiveDiagram(
        {
        ...current,
          activeDiagramId: nextActiveId,
          diagrams: nextDiagrams
        },
        current.project,
        nextActiveId
      );
    });

    setStatus("Closed diagram.");
  }

  function handleDeleteEntity() {
    if (selectedEntityIds.length > 1) {
      handleDeleteEntitiesByIds(selectedEntityIds);
      return;
    }

    if (!selectedEntityId) {
      return;
    }

    handleDeleteEntityById(selectedEntityId);
  }

  function handleDeleteEntitiesByIds(entityIds) {
    if (!entityIds || entityIds.length === 0) {
      return;
    }

    const idsToDelete = new Set(entityIds);
    let nextSelectedIds = [];

    setModel((current) => {
      const currentDiagram =
        current.diagrams.find((diagram) => diagram.id === current.activeDiagramId) ?? current.diagrams[0];
      const nextEntities =
        currentDiagram?.entities.filter(
          (entity) =>
            !idsToDelete.has(entity.id) &&
            !(
              isDrawingLineEntity(entity) &&
              (idsToDelete.has(entity.lineSourceId) || idsToDelete.has(entity.lineTargetId))
            )
        ) ?? [];
      nextSelectedIds = nextEntities[0]?.id ? [nextEntities[0].id] : [];

      return {
        ...current,
        diagrams: current.diagrams.map((diagram) =>
          diagram.id === current.activeDiagramId
            ? {
                ...diagram,
                entities: diagram.entities.filter(
                  (entity) =>
                    !idsToDelete.has(entity.id) &&
                    !(
                      isDrawingLineEntity(entity) &&
                      (idsToDelete.has(entity.lineSourceId) || idsToDelete.has(entity.lineTargetId))
                    )
                ),
                relationships: diagram.relationships.filter(
                  (relationship) =>
                    !idsToDelete.has(relationship.sourceEntityId) &&
                    !idsToDelete.has(relationship.targetEntityId)
                )
              }
            : diagram
        )
      };
    });

    setSelectedEntityIds(nextSelectedIds);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setStatus(
      `Deleted ${entityIds.length} ${entityIds.length === 1 ? "entity" : "entities"}.`
    );
  }

  function handleDeleteEntityById(entityId) {
    if (!entityId) {
      return;
    }
    handleDeleteEntitiesByIds([entityId]);
  }

  function handleDeleteRelationship() {
    if (!selectedRelationshipId) {
      return;
    }

    const relationshipId = selectedRelationshipId;

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              relationships: diagram.relationships.filter(
                (relationship) => relationship.id !== relationshipId
              )
            }
          : diagram
      )
    }));

    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setStatus("Deleted relationship.");
  }

  function handleAddAttribute(nameOverride = "", entityIdOverride = selectedEntityId) {
    if (!entityIdOverride) {
      return;
    }

    const requestedName = String(nameOverride ?? "").trim();
    let attributeId = null;
    let addedAttributeName = "";

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) => {
                if (entity.id !== entityIdOverride) {
                  return entity;
                }

                attributeId = getNextNumericWorkspaceId(current);
                addedAttributeName = requestedName || `Column${entity.fields.length + 1}`;
                return {
                  ...entity,
                  fields: [
                    ...entity.fields,
                    {
                      id: attributeId,
                      kind: "COL",
                      name: addedAttributeName,
                      physicalName: "",
                      comment: "",
                      dataType: "varchar(50)",
                      isNullable: true
                    }
                  ],
                  width: entity.width ?? 0,
                  height: 0
                };
              })
            }
          : diagram
      )
    }));

    if (!attributeId) {
      return;
    }

    setSelectedEntityIds([entityIdOverride]);
    setSelectedAttributeId(attributeId);
    setStatus(`Added attribute ${addedAttributeName}.`);
  }

  function handleAddChildAttribute(parentAttributeId) {
    if (!selectedEntity || !parentAttributeId) {
      return;
    }

    const childAttributeId = getNextNumericWorkspaceId(model);

    updateSelectedEntity((entity) => {
      const nextFields = addChildFieldToTree(entity.fields, parentAttributeId, (parentField) => ({
        id: childAttributeId,
        kind: "COL",
        name: `Child${(parentField.children?.length ?? 0) + 1}`,
        physicalName: "",
        comment: "",
        dataType: "string",
        isNullable: true
      }));

      if (nextFields === entity.fields) {
        return {};
      }

      return {
        fields: nextFields,
        width: entity.width ?? 0,
        height: 0
      };
    });

    setExpandedFieldIds((current) => ({
      ...current,
      [parentAttributeId]: true
    }));
    setSelectedAttributeId(childAttributeId);
    setStatus("Added a child attribute.");
  }

  function handleDeleteAttribute(attributeId) {
    updateSelectedEntity((entity) => ({
      fields: deleteFieldFromTree(entity.fields, attributeId)
    }));
    if (selectedAttributeId === attributeId) {
      setSelectedAttributeId(null);
    }
    setStatus("Removed an attribute.");
  }

  function handleMoveAttribute(attributeId, direction) {
    updateSelectedEntity((entity) => {
      const nextFields = moveFieldInTree(entity.fields, attributeId, direction);
      if (nextFields === entity.fields) {
        return {};
      }

      return { fields: nextFields };
    });

    setStatus(direction === "up" ? "Moved attribute up." : "Moved attribute down.");
  }

  function handleDropAttribute(draggedAttributeId, targetAttributeId, targetKind) {
    if (!draggedAttributeId || !targetAttributeId) {
      return;
    }

    updateSelectedEntity((entity) => {
      const nextFields = moveTopLevelFieldToTarget(entity.fields, draggedAttributeId, targetAttributeId, targetKind);
      if (nextFields === entity.fields) {
        return {};
      }

      return {
        fields: nextFields,
        height: 0
      };
    });

    setSelectedAttributeId(draggedAttributeId);
    setStatus(targetKind === "PK" ? "Moved attribute to primary key area." : "Moved attribute to non-primary area.");
  }

  function handleDropAttributeOnSeparator(draggedAttributeId, separatorFieldId) {
    if (!draggedAttributeId || !separatorFieldId) {
      return;
    }

    let promotedToPrimary = false;

    updateSelectedEntity((entity) => {
      const draggedField = (entity.fields ?? []).find((field) => field.id === draggedAttributeId);
      promotedToPrimary = draggedField?.kind !== "PK";
      const nextFields = moveTopLevelFieldToSeparator(entity.fields, draggedAttributeId, separatorFieldId);
      if (nextFields === entity.fields) {
        return {};
      }

      return {
        fields: nextFields,
        height: 0
      };
    });

    setSelectedAttributeId(draggedAttributeId);
    setStatus(promotedToPrimary ? "Moved attribute into primary key area." : "Moved attribute into non-primary area.");
  }

  function handleDropAttributeOnGroupEdge(draggedAttributeId, targetKind) {
    if (!draggedAttributeId || !targetKind) {
      return;
    }

    updateSelectedEntity((entity) => {
      const nextFields = moveTopLevelFieldToGroupEdge(entity.fields, draggedAttributeId, targetKind);
      if (nextFields === entity.fields) {
        return {};
      }

      return {
        fields: nextFields,
        height: 0
      };
    });

    setSelectedAttributeId(draggedAttributeId);
    setStatus(targetKind === "PK" ? "Moved attribute into primary key area." : "Moved attribute into non-primary area.");
  }

  function handleImportFormChange(field, value) {
    setImportForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSave() {
    try {
      const savePayload = {
        project: model.project,
        tabs,
        entities: activeDiagram?.entities ?? [],
        relationships: activeDiagram?.relationships ?? []
      };

      const response = await fetch(`${API_BASE_URL}/api/modeler/diagram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ diagram: savePayload })
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      const saved = await response.json();
      setModel((current) => ({
        ...current,
        project: saved.project ?? current.project
      }));
      setStatus("Saved model to ASP.NET Core Web API.");
    } catch {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(model));
      setStatus("Backend unavailable, saved model to local browser storage.");
    }
  }

  async function handleImportSchema() {
    if (!importForm.connectionString.trim()) {
      setStatus("Enter a connection string before importing a schema.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/introspect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(importForm)
      });

      if (!response.ok) {
        throw new Error("Schema import failed");
      }

      const result = await response.json();
      const importedDiagram = {
        id: model.activeDiagramId,
        name: activeDiagram?.name ?? "ER_Diagram_1",
        entities: result.diagram.entities ?? [],
        relationships: (result.diagram.relationships ?? []).map(normalizeRelationship)
      };
      setModel((current) => ({
        ...current,
        project: result.diagram.project ?? current.project,
        diagrams: current.diagrams.map((diagram) =>
          diagram.id === current.activeDiagramId ? importedDiagram : diagram
        )
      }));
      setSelectedEntityIds(importedDiagram.entities[0]?.id ? [importedDiagram.entities[0].id] : []);
      setSelectedRelationshipId(null);
      setLinkDraft(null);
      setStatus(result.summary);
    } catch {
      setStatus("Schema import requires the backend to be running with a reachable database.");
    }
  }

  function handlePanelResizeStart(side) {
    resizeState.current = { side };
    document.body.classList.add("panel-resizing");
  }

  function handleToggleReverseEngineering() {
    setReverseEngineering((current) => ({
      ...current,
      isOpen: !current.isOpen
    }));
  }

  function handleReverseEngineeringChange(field, value) {
    if (field === "selectedDatabaseName") {
      setReverseEngineering((current) => ({
        ...current,
        selectedDatabaseName: value,
        availableCollections: [],
        selectedCollectionNames: [],
        highlightedAvailableCollectionNames: [],
        highlightedSelectedCollectionNames: []
      }));
      return;
    }

    setReverseEngineering((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleCloseReverseEngineeringDatabaseDialog() {
    setReverseEngineering((current) => ({
      ...current,
      isDatabaseDialogOpen: false,
      dialogStep: "databases",
      highlightedAvailableDatabaseNames: [],
      highlightedSelectedDatabaseNames: [],
      highlightedAvailableCollectionNames: [],
      highlightedSelectedCollectionNames: []
    }));
  }

  function handleMoveReverseEngineeringDatabases(direction) {
    setReverseEngineering((current) => {
      const availableNames = (current.availableDatabases ?? []).map((database) => database.name);
      const selectedNames = current.selectedDatabaseNames ?? [];
      const availableSet = new Set(availableNames);
      const selectedSet = new Set(selectedNames);

      if (direction === "add") {
        const nextSelectedNames = [
          ...selectedNames,
          ...(current.highlightedAvailableDatabaseNames ?? []).filter((name) => availableSet.has(name) && !selectedSet.has(name))
        ];

        return {
          ...current,
          selectedDatabaseNames: nextSelectedNames,
          highlightedAvailableDatabaseNames: [],
          highlightedSelectedDatabaseNames: []
        };
      }

      if (direction === "addAll") {
        return {
          ...current,
          selectedDatabaseNames: availableNames,
          highlightedAvailableDatabaseNames: [],
          highlightedSelectedDatabaseNames: []
        };
      }

      if (direction === "remove") {
        const highlightedSelectedSet = new Set(current.highlightedSelectedDatabaseNames ?? []);
        return {
          ...current,
          selectedDatabaseNames: selectedNames.filter((name) => !highlightedSelectedSet.has(name)),
          highlightedSelectedDatabaseNames: [],
          highlightedAvailableDatabaseNames: []
        };
      }

      if (direction === "removeAll") {
        return {
          ...current,
          selectedDatabaseNames: [],
          highlightedSelectedDatabaseNames: [],
          highlightedAvailableDatabaseNames: []
        };
      }

      return current;
    });
  }

  async function handleConfirmReverseEngineeringDatabases() {
    const selectedDatabaseNames = reverseEngineering.selectedDatabaseNames ?? [];
    const labels = getReverseEngineeringLabels(normalizeDbEngine(model.project?.database));

    if (selectedDatabaseNames.length === 0) {
      setStatus("Select at least one database before continuing.");
      return;
    }

    if (selectedDatabaseNames.length !== 1) {
      setStatus(`Select exactly one database to continue to the ${labels.itemStepTitle.toLowerCase()} step.`);
      return;
    }

    const [selectedDatabaseName] = selectedDatabaseNames;
    await handleLoadReverseEngineeringCollections(selectedDatabaseName);
  }

  async function handleConnectReverseEngineering() {
    const provider = normalizeDbEngine(model.project?.database);
    const connectionString = buildReverseEngineeringConnectionString(provider, reverseEngineering);

    if (provider === "sqlserver" || provider === "postgresql") {
      if (!String(reverseEngineering.server ?? "").trim()) {
        setStatus("Enter a server name before connecting.");
        return;
      }

      if (!String(reverseEngineering.userName ?? "").trim()) {
        setStatus("Enter a user name before connecting.");
        return;
      }

      if (!String(reverseEngineering.password ?? "").trim()) {
        setStatus("Enter a password before connecting.");
        return;
      }
    } else if (!connectionString) {
      setStatus("Enter a connection string before connecting.");
      return;
    }

    setReverseEngineering((current) => ({
      ...current,
      isConnecting: true
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/reverse-engineer/databases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider,
          connectionString
        })
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Reverse engineering connection failed.")
        );
      }

      const data = await response.json();
      setReverseEngineering((current) => ({
        ...current,
        isConnecting: false,
        isDatabaseDialogOpen: true,
        dialogStep: "databases",
        availableDatabases: data.databases ?? [],
        highlightedAvailableDatabaseNames: [],
        selectedDatabaseName: "",
        selectedDatabaseNames: [],
        highlightedSelectedDatabaseNames: [],
        availableCollections: [],
        selectedCollectionNames: [],
        highlightedAvailableCollectionNames: [],
        highlightedSelectedCollectionNames: []
      }));
      setStatus(data.summary ?? "Connection verified.");
    } catch (error) {
      setReverseEngineering((current) => ({
        ...current,
        isConnecting: false
      }));
      setStatus(
        error instanceof Error
          ? `Reverse engineering connection failed: ${error.message}`
          : "Reverse engineering connection failed. Verify the backend is running and the connection string is valid."
      );
    }
  }

  async function handleLoadReverseEngineeringCollections(databaseNameOverride = null) {
    const provider = normalizeDbEngine(model.project?.database);
    const connectionString = buildReverseEngineeringConnectionString(provider, reverseEngineering);
    const selectedDatabaseName = String(
      databaseNameOverride ?? reverseEngineering.selectedDatabaseName ?? ""
    ).trim();
    const labels = getReverseEngineeringLabels(provider);

    if (!selectedDatabaseName) {
      setStatus(`Select one database before loading ${labels.databaseObjectLabel}.`);
      return;
    }

    setReverseEngineering((current) => ({
      ...current,
      isLoadingCollections: true
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/reverse-engineer/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider,
          connectionString,
          databaseName: selectedDatabaseName
        })
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Reverse engineering collection discovery failed.")
        );
      }

      const data = await response.json();
      setReverseEngineering((current) => ({
        ...current,
        isLoadingCollections: false,
        dialogStep: "collections",
        selectedDatabaseName,
        availableCollections: data.collections ?? [],
        selectedCollectionNames: [],
        highlightedAvailableCollectionNames: [],
        highlightedSelectedCollectionNames: []
      }));
      setStatus(data.summary ?? `Loaded ${labels.databaseObjectLabel} for ${selectedDatabaseName}.`);
    } catch (error) {
      setReverseEngineering((current) => ({
        ...current,
        isLoadingCollections: false
      }));
      setStatus(
        error instanceof Error
          ? `${labels.itemStepTitle} loading failed: ${error.message}`
          : `${labels.itemStepTitle} loading failed. Verify the selected database and connection string.`
      );
    }
  }

  function handleBackReverseEngineeringDialog() {
    setReverseEngineering((current) => ({
      ...current,
      dialogStep: "databases",
      highlightedAvailableCollectionNames: [],
      highlightedSelectedCollectionNames: []
    }));
  }

  async function handleRunReverseEngineering() {
    const provider = normalizeDbEngine(model.project?.database);
    const connectionString = buildReverseEngineeringConnectionString(provider, reverseEngineering);
    const selectedCollectionNames = reverseEngineering.selectedCollectionNames ?? [];
    const selectedDatabaseName = String(reverseEngineering.selectedDatabaseName ?? "").trim();
    const labels = getReverseEngineeringLabels(provider);

    if (!selectedDatabaseName) {
      setStatus("Select one database before running reverse engineering.");
      return;
    }

    if (selectedCollectionNames.length === 0) {
      setStatus(`Select at least one ${labels.databaseObjectSingular} before running reverse engineering.`);
      return;
    }

    setReverseEngineering((current) => ({
      ...current,
      isRunning: true
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/reverse-engineer/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider,
          connectionString,
          databaseName: selectedDatabaseName,
          collectionNames: selectedCollectionNames
        })
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Reverse engineering run failed.")
        );
      }

      const data = await response.json();
      importJsonText(data.modelJson, `${selectedDatabaseName} reverse engineering`);
      setReverseEngineering((current) => ({
        ...current,
        isRunning: false,
        isDatabaseDialogOpen: false,
        dialogStep: "databases",
        highlightedAvailableDatabaseNames: [],
        highlightedSelectedDatabaseNames: [],
        highlightedAvailableCollectionNames: [],
        highlightedSelectedCollectionNames: []
      }));
      setStatus(
        data.summary ?? `Reverse engineered ${selectedCollectionNames.length} ${labels.databaseObjectLabel}.`
      );
    } catch (error) {
      setReverseEngineering((current) => ({
        ...current,
        isRunning: false
      }));
      setStatus(
        error instanceof Error
          ? `Reverse engineering run failed: ${error.message}`
          : "Reverse engineering run failed."
      );
    }
  }

  function handleMoveReverseEngineeringCollections(direction) {
    setReverseEngineering((current) => {
      const availableNames = (current.availableCollections ?? []).map((collection) => collection.name);
      const selectedNames = current.selectedCollectionNames ?? [];
      const availableSet = new Set(availableNames);
      const selectedSet = new Set(selectedNames);

      if (direction === "add") {
        const nextSelectedNames = [
          ...selectedNames,
          ...(current.highlightedAvailableCollectionNames ?? []).filter((name) => availableSet.has(name) && !selectedSet.has(name))
        ];

        return {
          ...current,
          selectedCollectionNames: nextSelectedNames,
          highlightedAvailableCollectionNames: [],
          highlightedSelectedCollectionNames: []
        };
      }

      if (direction === "addAll") {
        return {
          ...current,
          selectedCollectionNames: availableNames,
          highlightedAvailableCollectionNames: [],
          highlightedSelectedCollectionNames: []
        };
      }

      if (direction === "remove") {
        const highlightedSelectedSet = new Set(current.highlightedSelectedCollectionNames ?? []);
        return {
          ...current,
          selectedCollectionNames: selectedNames.filter((name) => !highlightedSelectedSet.has(name)),
          highlightedSelectedCollectionNames: [],
          highlightedAvailableCollectionNames: []
        };
      }

      if (direction === "removeAll") {
        return {
          ...current,
          selectedCollectionNames: [],
          highlightedSelectedCollectionNames: [],
          highlightedAvailableCollectionNames: []
        };
      }

      return current;
    });
  }

  function handleToggleFieldExpansion(entityId, fieldId) {
    setExpandedFieldIds((current) => ({
      ...current,
      [fieldId]: !(current[fieldId] ?? true)
    }));
  }

  return (
    <div
      className="app-shell"
      style={
        isDesktopLayout
          ? {
              gridTemplateColumns: `${panelWidths.left}px 10px minmax(760px, 1fr) 10px ${panelWidths.right}px`,
              ...themeCssVars
            }
          : themeCssVars
      }
    >
      <input
        ref={jsonFileInputRef}
        className="hidden-file-input"
        type="file"
        accept=".json,.erwin_json,application/json"
        onChange={handleJsonFileInputChange}
      />

      <LeftSidebar
        project={model.project}
        aiModeler={aiModeler}
        aiLoading={aiLoading}
        aiActiveTask={aiActiveTask}
        aiElapsedSec={aiElapsedSec}
        entityCount={activeDiagram?.entities.filter((entity) => getEntityObjectType(entity) === "entity").length ?? 0}
        viewCount={activeDiagram?.entities.filter((entity) => getEntityObjectType(entity) === "view").length ?? 0}
        materializedViewCount={
          activeDiagram?.entities.filter((entity) => getEntityObjectType(entity) === "materializedView").length ?? 0
        }
        relationshipCount={activeDiagram?.relationships.length ?? 0}
        activeRelationshipTool={linkDraft?.relationshipType ?? null}
        showViewObjectsUi={showViewObjectsUi}
        showCachedViewObjectsUi={showCachedViewObjectsUi}
        cachedViewUiName={cachedViewUiName}
        databaseOptions={DATABASE_OPTIONS}
        databaseVersionOptions={databaseVersionOptions}
        displayLevelOptions={displayLevelOptions}
        viewModeOptions={VIEW_MODE_OPTIONS}
        jsonDraft={jsonDraft}
        reverseEngineering={reverseEngineering}
        onJsonDraftChange={setJsonDraft}
        onOpenModelProperties={() => setIsModelPropertiesOpen(true)}
        onOpenThemeSettings={handleOpenThemeSettings}
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
        onAutoLayout={handleAutoLayout}
        onAddEntity={handleAddEntity}
        onAddAnnotation={handleAddAnnotation}
        onAddDrawing={handleAddDrawing}
        onAddView={handleAddView}
        onAddMaterializedView={handleAddMaterializedView}
        onStartIdentifyingRelationship={handleStartIdentifyingRelationship}
        onStartNonIdentifyingRelationship={handleStartNonIdentifyingRelationship}
        onStartDerivedRelationship={handleStartDerivedRelationship}
        onStartSubCategoryRelationship={handleStartSubCategoryRelationship}
        onStartConnectorRelationship={handleStartConnectorRelationship}
        onProjectChange={handleProjectChange}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onClearJson={handleClearJson}
        onViewJson={handleViewJson}
        onToggleReverseEngineering={handleToggleReverseEngineering}
        onReverseEngineeringChange={handleReverseEngineeringChange}
        onConnectReverseEngineering={handleConnectReverseEngineering}
        onLoadReverseEngineeringCollections={handleLoadReverseEngineeringCollections}
        onAiSchemaDescriptionChange={(value) => handleAiModelerChange("schemaDescription", value)}
        onAiGenerate={handleAiGenerate}
        onAiGenerateComments={handleAiGenerateComments}
        onAiSummary={handleAiSummary}
        onAiTuning={handleAiTuning}
      />

      {isDesktopLayout ? (
        <div
          className="panel-resizer"
          role="separator"
          aria-label="Resize left panel"
          onPointerDown={() => handlePanelResizeStart("left")}
        />
      ) : null}

      <main className="workspace-shell">
        <TopTabs
          tabs={tabs}
          onSelectTab={handleSelectDiagram}
          onCloseTab={handleCloseDiagram}
          onAddDiagram={handleAddDiagram}
          onReload={handleReloadSample}
          onSave={handleSave}
          onClear={handleClearWorkspace}
        />
        <div className="workspace-status">{status}</div>
        <DiagramCanvas
          entities={visibleDiagramEntities}
          relationships={activeDiagram?.relationships ?? []}
          selectedEntityIds={selectedEntityIds}
          selectedRelationshipId={selectedRelationshipId}
          selectedAttributeId={selectedAttributeId}
          displayLevel={model.project.displayLevel}
          viewMode={model.project.viewMode}
          notationStyle={
            model.project.viewMode === "Logical View"
              ? model.project.logicalNotation
              : model.project.physicalNotation
          }
          lineStyle={model.project.lineStyle ?? sampleModel.project.lineStyle}
          isLinkingRelationship={Boolean(linkDraft)}
          zoom={zoom}
          expandedFieldIds={expandedFieldIds}
          focusEntityRequest={focusEntityRequest}
          focusRelationshipRequest={focusRelationshipRequest}
          onSelectEntity={handleSelectEntity}
          onSelectEntities={handleSetSelectedEntities}
          onSelectRelationship={handleSelectRelationship}
          onSelectAttribute={handleSelectAttribute}
          onMoveEntity={handleMoveEntity}
          onMoveEntities={handleMoveEntities}
          onMoveRelationship={handleMoveRelationship}
          onMoveRelationshipEndpoint={handleMoveRelationshipEndpoint}
          onInsertRelationshipBendPoint={handleInsertRelationshipBendPoint}
          onMoveRelationshipBendPoint={handleMoveRelationshipBendPoint}
          onRemoveRelationshipBendPoint={handleRemoveRelationshipBendPoint}
          onMoveDrawingLine={handleMoveDrawingLine}
          onMoveDrawingLineEndpoint={handleMoveDrawingLineEndpoint}
          onInsertDrawingLineBendPoint={handleInsertDrawingLineBendPoint}
          onMoveDrawingLineBendPoint={handleMoveDrawingLineBendPoint}
          onRemoveDrawingLineBendPoint={handleRemoveDrawingLineBendPoint}
          onResizeEntity={handleResizeEntity}
          onChangeAnnotationText={handleChangeAnnotationText}
          onChangeDrawingText={handleChangeDrawingText}
          onDeleteEntity={handleDeleteEntityById}
          onDeleteRelationship={handleDeleteRelationship}
          onToggleFieldExpansion={handleToggleFieldExpansion}
          onInlineAddAttribute={handleAddAttribute}
          onDeleteAttribute={handleDeleteAttribute}
          onDropAttribute={handleDropAttribute}
          onDropAttributeOnSeparator={handleDropAttributeOnSeparator}
          onDropAttributeOnGroupEdge={handleDropAttributeOnGroupEdge}
          onViewportChange={setDiagramViewport}
          viewResetToken={viewResetToken}
        />
      </main>

      {isDesktopLayout ? (
        <div
          className="panel-resizer"
          role="separator"
          aria-label="Resize right panel"
          onPointerDown={() => handlePanelResizeStart("right")}
        />
      ) : null}

      <RightInspector
          viewMode={model.project.viewMode}
          selectedEntity={selectedEntity}
          selectedAttribute={selectedAttribute}
          selectedRelationship={selectedRelationship}
          allEntities={visibleDiagramEntities}
          allRelationships={activeDiagram?.relationships ?? []}
          schemas={model.project?.schemas ?? []}
          datatypeOptions={datatypeOptions}
          importForm={importForm}
          providers={providers}
          status={status}
          zoom={zoom}
          onAddSchema={handleAddSchema}
          onSchemaChange={handleSchemaChange}
          onDeleteSchema={handleDeleteSchema}
          onEntityChange={handleEntityChange}
          onEditEntity={handleEditEntity}
          onGoToEntity={handleGoToEntity}
          onEditRelationship={handleEditRelationship}
          onGoToRelationship={handleGoToRelationship}
          onAddAttribute={handleAddAttribute}
          onAddChildAttribute={handleAddChildAttribute}
          onStartRelationshipLink={handleStartRelationshipLink}
          onDeleteEntity={handleDeleteEntity}
          onDeleteAttribute={handleDeleteAttribute}
          onMoveAttribute={handleMoveAttribute}
          onRelationshipChange={handleRelationshipChange}
        onDeleteRelationship={handleDeleteRelationship}
        onSelectRelationship={handleSelectRelationship}
        onImportFormChange={handleImportFormChange}
        onImportSchema={handleImportSchema}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        isLinkingRelationship={Boolean(linkDraft)}
      />

      {isJsonViewerOpen ? (
        <div
          className="json-modal-backdrop"
          onClick={() => setIsJsonViewerOpen(false)}
          role="presentation"
        >
          <section
            className="json-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="json-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="json-modal-header">
              <h2 id="json-modal-title">Model JSON</h2>
              <div className="button-row">
                <JsonActionButton label="Copy JSON" onClick={handleCopyJson}>
                  <CopyIcon />
                </JsonActionButton>
                <JsonActionButton label="Save JSON File" onClick={handleSaveJsonToFile}>
                  <SaveIcon />
                </JsonActionButton>
                <JsonActionButton label="Open JSON File" onClick={handleOpenJsonFile}>
                  <OpenIcon />
                </JsonActionButton>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsJsonViewerOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="json-modal-body">
              <pre>{jsonDraft}</pre>
            </div>
          </section>
        </div>
      ) : null}

      {isModelPropertiesOpen ? (
        <div
          className="json-modal-backdrop"
          onClick={() => setIsModelPropertiesOpen(false)}
          role="presentation"
        >
          <section
            className="json-modal model-properties-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="model-properties-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="json-modal-header">
              <h2 id="model-properties-title">Model Properties</h2>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsModelPropertiesOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="json-modal-body model-properties-body">
              <section className="panel">
                <div className="panel-label">Notation</div>

                <label className="field-group">
                  <span>Logical Notation</span>
                  <select
                    value={model.project.logicalNotation ?? sampleModel.project.logicalNotation}
                    onChange={(event) => handleProjectChange("logicalNotation", event.target.value)}
                  >
                    {LOGICAL_NOTATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Physical Notation</span>
                  <select
                    value={model.project.physicalNotation ?? sampleModel.project.physicalNotation}
                    onChange={(event) => handleProjectChange("physicalNotation", event.target.value)}
                  >
                    {PHYSICAL_NOTATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Line Style</span>
                  <select
                    value={model.project.lineStyle ?? sampleModel.project.lineStyle ?? "curve"}
                    onChange={(event) => handleProjectChange("lineStyle", event.target.value)}
                  >
                    <option value="curve">curve</option>
                    <option value="line">line</option>
                  </select>
                </label>
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {isThemeSettingsOpen ? (
        <div className="json-modal-backdrop" role="presentation">
          <section
            className="json-modal model-properties-modal theme-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="json-modal-header">
              <h2 id="theme-settings-title">Theme Settings</h2>
            </div>

            <div className="json-modal-body model-properties-body theme-settings-body">
              <div className="theme-settings-layout">
                <section className="panel theme-list-panel">
                  <div className="panel-label">Themes</div>
                  <div className="theme-list-toolbar">
                    <button type="button" className="secondary-button" onClick={handleAddThemeDraft}>
                      Add Theme
                    </button>
                    <button
                      type="button"
                      className="danger-button subtle-danger-button"
                      onClick={handleDeleteThemeDraft}
                      disabled={themeLibraryDraft.length <= 1}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="theme-list-control" role="list" aria-label="Theme list">
                    {themeLibraryDraft.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        className={`theme-list-item ${theme.id === selectedThemeDraft?.id ? "selected" : ""}`}
                        onClick={() => handleSelectThemeDraft(theme.id)}
                      >
                        <span className="theme-list-item-name">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {selectedThemeDraft ? (
                  <section className="panel theme-settings-panel">
                    <div className="panel-label">Theme</div>

                    <label className="field-group">
                      <span>Name</span>
                      <input
                        type="text"
                        value={selectedThemeDraft.name}
                        onChange={(event) => handleThemeNameChange(event.target.value)}
                      />
                    </label>

                    <label className="field-group">
                      <span>Default Font</span>
                      <select
                        value={selectedThemeDraft.settings.defaultFont}
                        onChange={(event) => handleThemeDraftChange("defaultFont", event.target.value)}
                      >
                        {THEME_FONT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-group">
                      <span>Diagram Fill</span>
                      <input
                        type="color"
                        value={selectedThemeDraft.settings.diagramFill}
                        onChange={(event) => handleThemeDraftChange("diagramFill", event.target.value)}
                      />
                    </label>

                    <label className="field-group">
                      <span>Entity Font</span>
                      <select
                        value={selectedThemeDraft.settings.entityFont}
                        onChange={(event) => handleThemeDraftChange("entityFont", event.target.value)}
                      >
                        {THEME_FONT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-group">
                      <span>Entity Fill</span>
                      <input
                        type="color"
                        value={selectedThemeDraft.settings.entityFill}
                        onChange={(event) => handleThemeDraftChange("entityFill", event.target.value)}
                      />
                    </label>

                    <label className="field-group">
                      <span>Attribute Font</span>
                      <select
                        value={selectedThemeDraft.settings.attributeFont}
                        onChange={(event) => handleThemeDraftChange("attributeFont", event.target.value)}
                      >
                        {THEME_FONT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-group">
                      <span>Relationship Text Font</span>
                      <select
                        value={selectedThemeDraft.settings.relationshipTextFont}
                        onChange={(event) => handleThemeDraftChange("relationshipTextFont", event.target.value)}
                      >
                        {THEME_FONT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-group">
                      <span>Relationship Line Color</span>
                      <input
                        type="color"
                        value={selectedThemeDraft.settings.relationshipLineColor}
                        onChange={(event) => handleThemeDraftChange("relationshipLineColor", event.target.value)}
                      />
                    </label>

                    <label className="field-group">
                      <span>Relationship Line Width</span>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        step="0.5"
                        value={selectedThemeDraft.settings.relationshipLineWidth}
                        onChange={(event) => handleThemeDraftChange("relationshipLineWidth", event.target.value)}
                      />
                    </label>

                    <label className="field-group">
                      <span>FK Column Color</span>
                      <input
                        type="color"
                        value={selectedThemeDraft.settings.fkColumnColor}
                        onChange={(event) => handleThemeDraftChange("fkColumnColor", event.target.value)}
                      />
                    </label>

                    <label className="field-group">
                      <span>PK Column Color</span>
                      <input
                        type="color"
                        value={selectedThemeDraft.settings.pkColumnColor}
                        onChange={(event) => handleThemeDraftChange("pkColumnColor", event.target.value)}
                      />
                    </label>
                  </section>
                ) : null}
              </div>
            </div>

            <div className="button-row theme-settings-actions">
              <button type="button" className="secondary-button" onClick={handleResetThemeSettings}>
                Reset
              </button>
              <button type="button" className="secondary-button" onClick={handleApplyThemeSettings}>
                Close
              </button>
              <button type="button" className="secondary-button" onClick={handleCancelThemeSettings}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isSummaryOpen ? (
        <div
          className="json-modal-backdrop"
          role="presentation"
        >
          <section
            className="json-modal summary-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="json-modal-header">
              <h2 id="summary-modal-title">Summary</h2>
              <button
                type="button"
                className="icon-button ai-modal-close"
                onClick={() => setIsSummaryOpen(false)}
                aria-label="Close Summary"
              >
                ×
              </button>
            </div>

            <div className="json-modal-body summary-modal-body">
              <label className="field-group summary-subject-field">
                <span>Subject Area</span>
                <select
                  value={summarySubjectAreaId}
                  onChange={(event) => setSummarySubjectAreaId(event.target.value)}
                >
                  {summarySubjectAreas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <section className="summary-chart-card">
                <div className="summary-donut-wrap">
                  <svg viewBox="0 0 160 160" className="summary-donut" aria-hidden="true">
                    <circle cx="80" cy="80" r="46" className="summary-donut-track" />
                    {summaryChart.segments.map((segment) => (
                      <circle
                        key={segment.key}
                        cx="80"
                        cy="80"
                        r="46"
                        className="summary-donut-segment"
                        style={{
                          stroke: segment.color,
                          strokeDasharray: `${segment.dash} ${Math.max(100 - segment.dash, 0)}`,
                          strokeDashoffset: `${25 - segment.offset}`
                        }}
                      />
                    ))}
                  </svg>
                  <div className="summary-donut-center">
                    <span>Total</span>
                    <strong>{summaryChart.total}</strong>
                  </div>
                </div>

                <div className="summary-legend">
                  {summaryChart.segments.map((segment) => (
                    <div key={segment.key} className="summary-legend-row">
                      <span className="summary-legend-dot" style={{ backgroundColor: segment.color }} />
                      <span>{segment.label}: {segment.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="summary-insights-card">
                <div className="summary-insights-head">
                  <h3>AI Insights</h3>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleGenerateSummaryInsights}
                    disabled={summaryInsightsLoading || aiModeler.validationStatus !== "success"}
                  >
                    {summaryInsightsLoading ? "Generating..." : "Generate Insights"}
                  </button>
                </div>

                <div className="summary-insights-grid">
                  <section className="summary-insights-group">
                    <h4>Deterministic Checks</h4>
                    <div className="summary-insights-list">
                      {summaryDeterministic.map((item) => (
                        <article key={item.id} className="summary-det-row">
                          <div className="summary-det-main">
                            <span>{item.text}</span>
                            {item.details?.length ? (
                              <button
                                type="button"
                                className="icon-button summary-det-toggle"
                                onClick={() => toggleSummaryDeterministicExpansion(item.id)}
                                aria-label={summaryDetExpanded[item.id] ? "Collapse details" : "Expand details"}
                              >
                                {summaryDetExpanded[item.id] ? "−" : "+"}
                              </button>
                            ) : null}
                          </div>
                          {summaryDetExpanded[item.id] && item.details?.length ? (
                            <ul className="summary-det-details">
                              {item.details.map((detail, index) => (
                                <li key={`${item.id}-${index}`}>{detail}</li>
                              ))}
                            </ul>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="summary-insights-group">
                    <h4>AI Narrative</h4>
                    <div className="summary-insights-summary">
                      {summaryInsights.aiSummary ? (
                        <>
                          <p>{summaryInsights.aiSummary}</p>
                          <div className="summary-recommendations">
                            <strong>Recommendations</strong>
                            {summaryInsights.aiRecommendations?.length ? (
                              <ul className="summary-det-details summary-recommendation-list">
                                {summaryInsights.aiRecommendations.map((item, index) => (
                                  <li key={`recommendation-${index}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="summary-insights-empty">No recommendations yet.</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="summary-insights-empty">
                          {aiModeler.validationStatus === "success"
                            ? "Click Generate Insights to create an AI narrative and recommendations."
                            : "Validate AI settings to enable narrative insight generation."}
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </section>
            </div>

            <div className="summary-footer summary-footer-sticky">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsSummaryOpen(false)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isAiTuningOpen ? (
        <div className="json-modal-backdrop" role="presentation">
          <section
            className="json-modal ai-tuning-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-tuning-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="json-modal-header">
              <h2 id="ai-tuning-title">AI Tuning</h2>
              <button
                type="button"
                className="icon-button ai-modal-close"
                onClick={() => {
                  setIsAiTuningOpen(false);
                  setSelectedAiTuningKeys([]);
                }}
                aria-label="Close AI Tuning"
              >
                ×
              </button>
            </div>

            <div className="json-modal-body ai-tuning-body">
              {aiTuningFindings.length > 0 ? (
                <div className="ai-tuning-list">
                  <div className="ai-tuning-header-row">
                    <button
                      type="button"
                      className="icon-button ai-tuning-check-all"
                      title={
                        selectedAiTuningKeys.length === aiTuningFindings.length
                          ? "Uncheck all"
                          : "Check all"
                      }
                      onClick={() => {
                        if (selectedAiTuningKeys.length === aiTuningFindings.length) {
                          setSelectedAiTuningKeys([]);
                        } else {
                          setSelectedAiTuningKeys(aiTuningFindings.map((item) => item.rowKey));
                        }
                      }}
                    >
                      {selectedAiTuningKeys.length === aiTuningFindings.length ? "☑" : "☐"}
                    </button>
                    <span>Description</span>
                  </div>

                  <div className="ai-tuning-rows">
                    {aiTuningFindings.map((item) => (
                      <label key={item.rowKey} className="ai-tuning-row">
                        <input
                          type="checkbox"
                          checked={selectedAiTuningKeys.includes(item.rowKey)}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setSelectedAiTuningKeys((current) =>
                              checked
                                ? current.includes(item.rowKey)
                                  ? current
                                  : [...current, item.rowKey]
                                : current.filter((value) => value !== item.rowKey)
                            );
                          }}
                        />
                        <span>
                          <strong>{item.label}</strong> ({item.errorCount} issues)
                          {item.issues?.length ? ` - ${item.issues.join(", ")}` : ""}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="summary-insights-empty">No tuning issues found.</p>
              )}
            </div>

            <div className="ai-tuning-footer">
              <span className="ai-tuning-total">
                {`Total (${aiTuningFindings.length}): ${aiTuningFindings.length === 1 ? "Item" : "Items"}`}
              </span>
              <div className="button-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setIsAiTuningOpen(false);
                    setSelectedAiTuningKeys([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={applyAiTuningSelected}
                  disabled={selectedAiTuningKeys.length === 0}
                >
                  OK
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isAiSettingsOpen ? (
        <div
          className="json-modal-backdrop"
          role="presentation"
        >
          <section
            className="json-modal ai-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="json-modal-header">
              <h2 id="ai-settings-title">AI Settings</h2>
              <button
                type="button"
                className="icon-button ai-modal-close"
                onClick={() => setIsAiSettingsOpen(false)}
                aria-label="Close AI Settings"
              >
                ×
              </button>
            </div>

            <div className="json-modal-body model-properties-body ai-settings-body">
              <section className="panel">
                {(() => {
                  const isOpenAi = aiModeler.engine === "OpenAI";
                  return (
                    <>
                <label className="field-group">
                  <span>AI Engine</span>
                  <select
                    value={aiModeler.engine}
                    onChange={(event) => handleAiModelerChange("engine", event.target.value)}
                  >
                    {AI_ENGINE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                {!isOpenAi ? (
                  <label className="field-group">
                    <span>Endpoint</span>
                    <input
                      value={aiModeler.endpoint}
                      onChange={(event) => handleAiModelerChange("endpoint", event.target.value)}
                      placeholder="https://dm-ai-api.openai.azure.com"
                    />
                  </label>
                ) : null}

                <label className="field-group">
                  <span>API Key</span>
                  <div className="ai-secret-field">
                    <input
                      type={aiModeler.isKeyVisible ? "text" : "password"}
                      value={aiModeler.apiKey}
                      onChange={(event) => handleAiModelerChange("apiKey", event.target.value)}
                      placeholder={isOpenAi ? "Enter OpenAI API key" : "Enter Azure OpenAI API key"}
                    />
                    <button
                      type="button"
                      className="subtle-button ai-secret-toggle"
                      onClick={handleToggleAiKeyVisibility}
                    >
                      {aiModeler.isKeyVisible ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                {!isOpenAi ? (
                  <>
                    <label className="field-group">
                      <span>API Version</span>
                      <input
                        value={aiModeler.apiVersion}
                        onChange={(event) => handleAiModelerChange("apiVersion", event.target.value)}
                        placeholder="2024-08-01-preview"
                      />
                    </label>

                    <label className="field-group">
                      <span>API Deployment</span>
                      <input
                        value={aiModeler.deployment}
                        onChange={(event) => handleAiModelerChange("deployment", event.target.value)}
                        placeholder="gpt-4o"
                      />
                    </label>
                  </>
                ) : null}

                {aiModeler.validationMessage ? (
                  <div className={`ai-validation-message ${aiModeler.validationStatus}`}>
                    {aiModeler.validationMessage}
                  </div>
                ) : null}

                <div className="button-row ai-settings-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleValidateAiSettings}
                    disabled={aiModeler.isValidating}
                  >
                    {aiModeler.isValidating ? "Validating..." : "Validate"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setIsAiSettingsOpen(false)}
                  >
                    Close
                  </button>
                </div>
                    </>
                  );
                })()}
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {reverseEngineering.isDatabaseDialogOpen ? (
        <div
          className="json-modal-backdrop"
          onClick={handleCloseReverseEngineeringDatabaseDialog}
          role="presentation"
        >
          <section
            className="json-modal reverse-engineering-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reverse-engineering-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="json-modal-header">
              <div>
                <h2 id="reverse-engineering-dialog-title">
                  {reverseEngineering.dialogStep === "collections" ? reverseEngineeringLabels.itemStepTitle : "Available Databases"}
                </h2>
                <p className="reverse-engineering-dialog-copy">
                  {reverseEngineering.dialogStep === "collections"
                    ? `Select ${reverseEngineeringLabels.databaseObjectLabel} from ${reverseEngineering.selectedDatabaseName}.`
                    : `Select one database to continue to the ${reverseEngineeringLabels.itemStepTitle.toLowerCase()} step.`}
                </p>
              </div>
              <div className="button-row">
                {reverseEngineering.dialogStep === "collections" ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleBackReverseEngineeringDialog}
                  >
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCloseReverseEngineeringDatabaseDialog}
                >
                  Close
                </button>
                {reverseEngineering.dialogStep === "collections" ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleRunReverseEngineering}
                    disabled={(reverseEngineering.selectedCollectionNames ?? []).length === 0 || reverseEngineering.isRunning}
                  >
                    {reverseEngineering.isRunning ? "Running..." : "Run"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleConfirmReverseEngineeringDatabases}
                    disabled={(reverseEngineering.selectedDatabaseNames ?? []).length === 0}
                  >
                    Next
                  </button>
                )}
              </div>
            </div>

            {reverseEngineering.dialogStep === "collections" ? (
              <div className="reverse-engineering-dialog-body">
                <div className="reverse-engineering-column">
                  <label className="field-group">
                    <span>{reverseEngineeringLabels.itemAvailableTitle}</span>
                    <div className="reverse-engineering-dialog-list">
                      {reverseEngineeringAvailableCollectionOptions.map((collection) => {
                        const isHighlighted = (reverseEngineering.highlightedAvailableCollectionNames ?? []).includes(collection.name);
                        return (
                          <button
                            key={collection.name}
                            type="button"
                            className={`reverse-engineering-dialog-item ${isHighlighted ? "selected" : ""}`}
                            onClick={() => {
                              const currentHighlight = reverseEngineering.highlightedAvailableCollectionNames ?? [];
                              const nextHighlight = currentHighlight.includes(collection.name)
                                ? currentHighlight.filter((name) => name !== collection.name)
                                : [...currentHighlight, collection.name];
                              handleReverseEngineeringChange("highlightedAvailableCollectionNames", nextHighlight);
                            }}
                          >
                            <span>{collection.name}</span>
                            <span>{collection.documentCount} {collection.documentLabel ?? reverseEngineeringLabels.itemCountLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </label>
                </div>

                <div className="reverse-engineering-transfer-buttons">
                  <button type="button" className="secondary-button" onClick={() => handleMoveReverseEngineeringCollections("add")}>
                    &gt;
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleMoveReverseEngineeringCollections("addAll")}>
                    &gt;&gt;
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleMoveReverseEngineeringCollections("remove")}>
                    &lt;
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleMoveReverseEngineeringCollections("removeAll")}>
                    &lt;&lt;
                  </button>
                </div>

                <div className="reverse-engineering-column">
                  <label className="field-group">
                    <span>{reverseEngineeringLabels.itemSelectedTitle}</span>
                    <div className="reverse-engineering-dialog-list">
                      {reverseEngineeringSelectedCollectionOptions.map((collection) => {
                        const isHighlighted = (reverseEngineering.highlightedSelectedCollectionNames ?? []).includes(collection.name);
                        return (
                          <button
                            key={collection.name}
                            type="button"
                            className={`reverse-engineering-dialog-item ${isHighlighted ? "selected" : ""}`}
                            onClick={() => {
                              const currentHighlight = reverseEngineering.highlightedSelectedCollectionNames ?? [];
                              const nextHighlight = currentHighlight.includes(collection.name)
                                ? currentHighlight.filter((name) => name !== collection.name)
                                : [...currentHighlight, collection.name];
                              handleReverseEngineeringChange("highlightedSelectedCollectionNames", nextHighlight);
                            }}
                          >
                            <span>{collection.name}</span>
                            <span>{collection.documentCount} {collection.documentLabel ?? reverseEngineeringLabels.itemCountLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <div className="reverse-engineering-dialog-body">
                <div className="reverse-engineering-column">
                  <label className="field-group">
                    <span>Available Databases</span>
                    <div className="reverse-engineering-dialog-list">
                      {reverseEngineeringAvailableDatabaseOptions.map((database) => {
                        const isHighlighted = (reverseEngineering.highlightedAvailableDatabaseNames ?? []).includes(database.name);
                        return (
                          <button
                            key={database.name}
                            type="button"
                            className={`reverse-engineering-dialog-item ${isHighlighted ? "selected" : ""}`}
                            onClick={() => {
                              const currentHighlight = reverseEngineering.highlightedAvailableDatabaseNames ?? [];
                              const nextHighlight = currentHighlight.includes(database.name)
                                ? currentHighlight.filter((name) => name !== database.name)
                                : [...currentHighlight, database.name];
                              handleReverseEngineeringChange("highlightedAvailableDatabaseNames", nextHighlight);
                            }}
                          >
                            <span>{database.name}</span>
                            <span>{database.collectionCount} {database.collectionLabel ?? reverseEngineeringLabels.databaseObjectLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </label>
                </div>

                <div className="reverse-engineering-transfer-buttons">
                  <button type="button" className="secondary-button" onClick={() => handleMoveReverseEngineeringDatabases("add")}>
                    &gt;
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleMoveReverseEngineeringDatabases("addAll")}>
                    &gt;&gt;
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleMoveReverseEngineeringDatabases("remove")}>
                    &lt;
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleMoveReverseEngineeringDatabases("removeAll")}>
                    &lt;&lt;
                  </button>
                </div>

                <div className="reverse-engineering-column">
                  <label className="field-group">
                    <span>Selected Databases</span>
                    <div className="reverse-engineering-dialog-list">
                      {reverseEngineeringSelectedDatabaseOptions.map((database) => {
                        const isHighlighted = (reverseEngineering.highlightedSelectedDatabaseNames ?? []).includes(database.name);
                        return (
                          <button
                            key={database.name}
                            type="button"
                            className={`reverse-engineering-dialog-item ${isHighlighted ? "selected" : ""}`}
                            onClick={() => {
                              const currentHighlight = reverseEngineering.highlightedSelectedDatabaseNames ?? [];
                              const nextHighlight = currentHighlight.includes(database.name)
                                ? currentHighlight.filter((name) => name !== database.name)
                                : [...currentHighlight, database.name];
                              handleReverseEngineeringChange("highlightedSelectedDatabaseNames", nextHighlight);
                            }}
                          >
                            <span>{database.name}</span>
                            <span>{database.collectionCount} {database.collectionLabel ?? reverseEngineeringLabels.databaseObjectLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </label>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
