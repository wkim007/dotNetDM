import { useEffect, useMemo, useRef, useState } from "react";
import LeftSidebar from "./components/LeftSidebar";
import TopTabs from "./components/TopTabs";
import DiagramCanvas from "./components/DiagramCanvas";
import RightInspector from "./components/RightInspector";
import { sampleModel } from "./data/sampleModel";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7248";
const LOCAL_STORAGE_KEY = "dotnetdm-model";
const PANEL_STORAGE_KEY = "dotnetdm-panel-widths";
const JSON_DRAFT_STORAGE_KEY = "dotnetdm-json-draft";
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
const ROW_HEIGHT = 33;
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

  if (normalized === "sqlserver") {
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

function normalizeRelationshipType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

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

  return "7";
}

function getEntityObjectType(entity) {
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
        physicalOnly: false,
        logicalOnly: false,
        indexes: entity.indexes ?? [],
        attributes: (entity.fields ?? []).map(serializeFieldToAttribute),
        props: {
          pParentRelationshipsRef: [],
          pChildRelationshipsRef: []
        }
      };

      const objectType = getEntityObjectType(entity);
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
        physicalOnly: false,
        logicalOnly: false,
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
              physicalName: relationship.physicalName ?? relationship.id
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
      entities,
      relationships
    };
  });

  const activeDiagram = diagrams.find((diagram) => diagram.id === activeDiagramId) ?? diagrams[0];
  const viewMode = String(payload?.meta?.viewMode ?? "physical").toLowerCase() === "logical"
    ? "Logical View"
    : "Physical View";

  return {
    project: {
      name: "Data Modeler",
      viewMode,
      database: dbMeta.label,
      databaseVersion: `${dbMeta.major}${dbMeta.minor ? `.${dbMeta.minor}` : ""}`,
      schemas: (workspace?.schemas ?? []).map((schema) => ({
        id: String(schema.id),
        name: schema.name ?? "",
        comment: schema.comment ?? ""
      })),
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
  const fields = flattenFieldsForLayout(entity.fields ?? []);
  const hasNestedFields = fields.some((field) => field.hasChildren || field.depth > 0);
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
      CARD_HEADER + fields.length * ROW_HEIGHT + 18 + (hasNestedFields ? ROW_HEIGHT : 0)
    )
  };
}

function normalizeRelationship(relationship) {
  return {
    ...relationship,
    name: relationship.name ?? relationship.id,
    physicalName: relationship.physicalName ?? relationship.id,
    description: relationship.description ?? "relates_to",
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

function normalizeModel(rawModel) {
  const baseModel = clone(rawModel ?? sampleModel);

  if (baseModel?.workspace?.subjectAreas || baseModel?.data?.subjectAreas || baseModel?.subjectAreas) {
    return importWorkspaceModel(baseModel);
  }

  if (Array.isArray(baseModel.diagrams) && baseModel.diagrams.length > 0) {
    return syncProjectWithActiveDiagram({
      ...baseModel,
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
    project: baseModel.project ?? sampleModel.project,
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
  const [model, setModel] = useState(initialModel);
  const [jsonDraft, setJsonDraft] = useState(() => readJsonDraft());
  const [isJsonViewerOpen, setIsJsonViewerOpen] = useState(false);
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
  const resizeState = useRef(null);
  const jsonFileInputRef = useRef(null);
  const activeDiagram = useMemo(
    () => model.diagrams.find((diagram) => diagram.id === model.activeDiagramId) ?? model.diagrams[0],
    [model]
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

    const padding = 48;
    const gapX = 42;
    const gapY = 42;
    const usableWidth = Math.max(viewport.width - padding * 2, 480);
    const usableHeight = Math.max(viewport.height - padding * 2, 480);
    const orderedEntities = [...entities].sort((left, right) => {
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

    return orderedEntities.map(
      (entity) => positionedEntities.find((positionedEntity) => positionedEntity.id === entity.id) ?? entity
    );
  }

  async function loadProviders() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/providers`);
      if (!response.ok) {
        throw new Error("Provider request failed");
      }

      const data = await response.json();
      setProviders(data);
    } catch {
      setStatus("Backend unavailable, using built-in provider list.");
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
    } catch {
      setStatus("Backend unavailable, showing local sample model.");
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
    }
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

  function handleExportJson() {
    const exportedJson = JSON.stringify(exportModelToWorkspaceJson(model), null, 2);
    setJsonDraft(exportedJson);
    setStatus("Exported the current model to the JSON box.");
  }

  function handleViewJson() {
    if (!jsonDraft.trim()) {
      const exportedJson = JSON.stringify(exportModelToWorkspaceJson(model), null, 2);
      setJsonDraft(exportedJson);
    }
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
    const contentToCopy = jsonDraft.trim()
      ? jsonDraft
      : JSON.stringify(exportModelToWorkspaceJson(model), null, 2);

    try {
      await navigator.clipboard.writeText(contentToCopy);
      setStatus("Copied model JSON to the clipboard.");
    } catch {
      setStatus("Copy failed. Your browser blocked clipboard access.");
    }
  }

  async function handleSaveJsonToFile() {
    const contentToSave = jsonDraft.trim()
      ? jsonDraft
      : JSON.stringify(exportModelToWorkspaceJson(model), null, 2);
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

  function handleAddEntity() {
    const [entityId, fieldId] = getNextNumericWorkspaceIds(model, 2);
    const newEntity = {
      id: entityId,
      name: "New Entity",
      physicalName: "NewEntity",
      comment: "Describe this entity.",
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
      const nextEntities = currentDiagram?.entities.filter((entity) => !idsToDelete.has(entity.id)) ?? [];
      nextSelectedIds = nextEntities[0]?.id ? [nextEntities[0].id] : [];

      return {
        ...current,
        diagrams: current.diagrams.map((diagram) =>
          diagram.id === current.activeDiagramId
            ? {
                ...diagram,
                entities: diagram.entities.filter((entity) => !idsToDelete.has(entity.id)),
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

  function handleAddAttribute() {
    if (!selectedEntity) {
      return;
    }

    const attributeId = getNextNumericWorkspaceId(model);
    updateSelectedEntity((entity) => ({
      fields: [
        ...entity.fields,
        {
          id: attributeId,
          kind: "COL",
          name: `Column${entity.fields.length + 1}`,
          physicalName: "",
          comment: "",
          dataType: "varchar(50)",
          isNullable: true
        }
      ]
    }));
    setSelectedAttributeId(attributeId);
    setStatus("Added an attribute.");
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

      return { fields: nextFields };
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

    if (!reverseEngineering.connectionString.trim()) {
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
          connectionString: reverseEngineering.connectionString
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
          connectionString: reverseEngineering.connectionString,
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
          connectionString: reverseEngineering.connectionString,
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
              gridTemplateColumns: `${panelWidths.left}px 10px minmax(760px, 1fr) 10px ${panelWidths.right}px`
            }
          : undefined
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
        onAutoLayout={handleAutoLayout}
        onAddEntity={handleAddEntity}
        onAddView={handleAddView}
        onAddMaterializedView={handleAddMaterializedView}
        onStartIdentifyingRelationship={handleStartIdentifyingRelationship}
        onStartNonIdentifyingRelationship={handleStartNonIdentifyingRelationship}
        onStartDerivedRelationship={handleStartDerivedRelationship}
        onStartSubCategoryRelationship={handleStartSubCategoryRelationship}
        onProjectChange={handleProjectChange}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onClearJson={handleClearJson}
        onViewJson={handleViewJson}
        onToggleReverseEngineering={handleToggleReverseEngineering}
        onReverseEngineeringChange={handleReverseEngineeringChange}
        onConnectReverseEngineering={handleConnectReverseEngineering}
        onLoadReverseEngineeringCollections={handleLoadReverseEngineeringCollections}
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
          entities={activeDiagram?.entities ?? []}
          relationships={activeDiagram?.relationships ?? []}
          selectedEntityIds={selectedEntityIds}
          selectedRelationshipId={selectedRelationshipId}
          selectedAttributeId={selectedAttributeId}
          displayLevel={model.project.displayLevel}
          viewMode={model.project.viewMode}
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
          onResizeEntity={handleResizeEntity}
          onDeleteEntity={handleDeleteEntityById}
          onDeleteRelationship={handleDeleteRelationship}
          onToggleFieldExpansion={handleToggleFieldExpansion}
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
          selectedEntity={selectedEntity}
          selectedAttribute={selectedAttribute}
          selectedRelationship={selectedRelationship}
          allEntities={activeDiagram?.entities ?? []}
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
