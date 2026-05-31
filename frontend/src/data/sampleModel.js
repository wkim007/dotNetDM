export const sampleModel = {
  project: {
    name: "Data Modeler",
    viewMode: "Physical View",
    database: "PostgreSQL",
    databaseVersion: "16",
    subjectArea: "<model>",
    definition: "Drag entities, define attributes, and wire relationships.",
    diagramDefinition: "Sample bookstore and fulfillment domain.",
    displayLevel: "Column"
  },
  activeDiagramId: "er-diagram-1",
  diagrams: [
    {
      id: "er-diagram-1",
      name: "ER_Diagram_1",
      entities: [
        {
          id: "store",
          name: "Store Name",
          physicalName: "Store",
          comment: "The retail location where books are sold and orders originate.",
          x: 430,
          y: 120,
          fields: [
            { id: "store-id", kind: "PK", name: "StoreId", dataType: "uuid" },
            { id: "store-name", kind: "COL", name: "StoreName", dataType: "varchar(80)" },
            { id: "store-city", kind: "COL", name: "City", dataType: "varchar(40)" },
            { id: "store-state", kind: "COL", name: "State", dataType: "varchar(10)" },
            { id: "store-region-id", kind: "FK", name: "RegionId", dataType: "uuid" }
          ]
        },
        {
          id: "order",
          name: "Purchase Order",
          physicalName: "PurchaseOrder",
          comment: "Represents store-level customer purchases.",
          x: 790,
          y: 130,
          fields: [
            { id: "order-number", kind: "PK", name: "OrderNumber", dataType: "integer" },
            { id: "payment-terms", kind: "COL", name: "PaymentTerms", dataType: "varchar(12)" },
            { id: "order-date", kind: "COL", name: "OrderDate", dataType: "date" },
            { id: "customer-id", kind: "FK", name: "CustomerId", dataType: "uuid" },
            { id: "store-id-fk", kind: "FK", name: "StoreId", dataType: "uuid" }
          ]
        },
        {
          id: "employee",
          name: "Employee",
          physicalName: "Employee",
          comment: "Staff assigned to operational jobs.",
          x: 430,
          y: 520,
          fields: [
            { id: "employee-id", kind: "PK", name: "EmployeeId", dataType: "uuid" },
            { id: "first-name", kind: "COL", name: "FirstName", dataType: "varchar(40)" },
            { id: "last-name", kind: "COL", name: "LastName", dataType: "varchar(40)" },
            { id: "hire-date", kind: "COL", name: "HireDate", dataType: "date" },
            { id: "job-id", kind: "FK", name: "JobId", dataType: "uuid" }
          ]
        },
        {
          id: "job",
          name: "Job",
          physicalName: "Job",
          comment: "Defines staff responsibility and level ranges.",
          x: 790,
          y: 380,
          fields: [
            { id: "job-id-pk", kind: "PK", name: "JobId", dataType: "uuid" },
            { id: "job-description", kind: "COL", name: "JobDescription", dataType: "varchar(80)" },
            { id: "min-level", kind: "COL", name: "MinLevel", dataType: "smallint" },
            { id: "max-level", kind: "COL", name: "MaxLevel", dataType: "smallint" }
          ]
        },
        {
          id: "book",
          name: "Book",
          physicalName: "Book",
          comment: "Catalog item sold in orders.",
          x: 420,
          y: 810,
          fields: [
            { id: "book-id", kind: "PK", name: "BookId", dataType: "uuid" },
            { id: "book-name", kind: "COL", name: "BookName", dataType: "varchar(120)" },
            { id: "book-type", kind: "COL", name: "BookType", dataType: "varchar(24)" },
            { id: "price", kind: "COL", name: "Price", dataType: "decimal(19,4)" }
          ]
        },
        {
          id: "order-item",
          name: "Order Item",
          physicalName: "OrderItem",
          comment: "Line items attached to a purchase order.",
          x: 760,
          y: 820,
          fields: [
            { id: "item-sequence", kind: "PK", name: "ItemSequence", dataType: "integer" },
            { id: "order-number-fk", kind: "FK", name: "OrderNumber", dataType: "integer" },
            { id: "book-id-fk", kind: "FK", name: "BookId", dataType: "uuid" },
            { id: "quantity", kind: "COL", name: "Quantity", dataType: "smallint" },
            { id: "order-price", kind: "COL", name: "OrderPrice", dataType: "decimal(7,2)" }
          ]
        },
        {
          id: "author",
          name: "Author",
          physicalName: "Author",
          comment: "Writer metadata for cataloged books.",
          x: 1070,
          y: 620,
          fields: [
            { id: "author-id", kind: "PK", name: "AuthorId", dataType: "uuid" },
            { id: "author-last-name", kind: "COL", name: "LastName", dataType: "varchar(50)" },
            { id: "author-first-name", kind: "COL", name: "FirstName", dataType: "varchar(50)" },
            { id: "author-phone-number", kind: "COL", name: "PhoneNumber", dataType: "varchar(20)" }
          ]
        }
      ],
      relationships: [
        {
          id: "store-orders",
          sourceEntityId: "store",
          targetEntityId: "order",
          name: "Store -> PurchaseOrder",
          physicalName: "store-orders",
          description: "relates_to",
          parentAttribute: "Entity header",
          childAttribute: "Entity header",
          migratedKeyIndex: "Select parent index",
          cardinality: "1:N",
          relationshipType: "Non-Identifying",
          style: "solid"
        },
        {
          id: "job-employees",
          sourceEntityId: "job",
          targetEntityId: "employee",
          name: "Job -> Employee",
          physicalName: "job-employees",
          description: "relates_to",
          parentAttribute: "Entity header",
          childAttribute: "Entity header",
          migratedKeyIndex: "Select parent index",
          cardinality: "1:N",
          relationshipType: "Non-Identifying",
          style: "solid"
        },
        {
          id: "orders-items",
          sourceEntityId: "order",
          targetEntityId: "order-item",
          name: "PurchaseOrder -> OrderItem",
          physicalName: "orders-items",
          description: "contains",
          parentAttribute: "Entity header",
          childAttribute: "Entity header",
          migratedKeyIndex: "Select parent index",
          cardinality: "1:N",
          relationshipType: "Identifying",
          style: "solid"
        },
        {
          id: "books-items",
          sourceEntityId: "book",
          targetEntityId: "order-item",
          name: "Book -> OrderItem",
          physicalName: "books-items",
          description: "relates_to",
          parentAttribute: "Entity header",
          childAttribute: "Entity header",
          migratedKeyIndex: "Select parent index",
          cardinality: "1:N",
          relationshipType: "Non-Identifying",
          style: "dashed"
        },
        {
          id: "authors-books",
          sourceEntityId: "author",
          targetEntityId: "book",
          name: "Author -> Book",
          physicalName: "authors-books",
          description: "writes",
          parentAttribute: "Entity header",
          childAttribute: "Entity header",
          migratedKeyIndex: "Select parent index",
          cardinality: "1:N",
          relationshipType: "Non-Identifying",
          style: "dashed"
        }
      ]
    }
  ]
};
