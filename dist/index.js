// import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { executeReadOnlyQuery, executeQuery, poolPromise } from './db/index.js';
const toolDescription = '使用mysql数据库，执行查询操作，目前只支持查询。';
export default function createMcpServer({ sessionId }) {
    const server = new Server({
        name: 'mcp-mysql',
        version: '1.1.0',
    }, {
        capabilities: {
            resources: {},
            tools: {
                mysql_query: {
                    description: toolDescription,
                    inputSchema: {
                        type: "object",
                        properties: {
                            sql: {
                                type: "string",
                                description: "The SQL query to execute",
                            },
                        },
                        required: ["sql"],
                    },
                }
            }
        }
    });
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
        const tablesQuery = `
      SELECT
        table_name as name,
        table_schema as \`database\`,
        table_comment as description,
        table_rows as rowCount,
        data_length as dataSize,
        index_length as indexSize,
        create_time as createTime,
        update_time as updateTime
      FROM
        information_schema.tables
      WHERE
        table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
      ORDER BY
        table_schema, table_name
    `;
        const queryResult = await executeReadOnlyQuery(tablesQuery);
        const tables = JSON.parse(queryResult.content[0].text);
        const resources = tables.map((table) => ({
            uri: `mysql://tables/${table.name}`,
            name: table.name,
            title: `${table.database}.${table.name}`,
            description: table.description || `Table ${table.name} in ${table.database} database`,
            mimeType: 'application/json',
        }));
        resources.push({
            uri: "mysql://tables",
            name: "Tables",
            title: "MySQL Tables",
            description: "List of all MySQL tables",
            mimeType: "application/json",
        });
        return { resources };
    });
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        try {
            const uriParts = request.params.uri.split('/');
            const tableName = uriParts.pop();
            const dbName = uriParts.length > 0 ? uriParts.pop() : '';
            if (!tableName) {
                throw new Error(`Invalid resource URI: ${request.params.uri}`);
            }
            let columnQuery = 'select column_name, data_type from information_schema.columns where table_name =';
            const queryParams = [tableName];
            if (dbName) {
                columnQuery += ' and table_schema = ?';
                queryParams.push(dbName);
            }
            const results = await executeQuery(columnQuery, queryParams);
            return {
                contents: [{
                        uri: request.params.uri,
                        mimeType: 'application/json',
                        text: JSON.stringify(results, null, 2),
                    }]
            };
        }
        catch (error) {
            throw error;
        }
    });
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            if (request.params.name !== "mysql_query") {
                throw new Error(`Unknown tool: ${request.params.name}`);
            }
            const sql = request.params.arguments?.sql;
            return await executeReadOnlyQuery(sql);
        }
        catch (error) {
            return {
                content: [{
                        type: 'text',
                        text: `Error: ${error.message}`,
                    }],
                isError: true,
            };
        }
    });
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [{
                    name: 'mysql_query',
                    description: toolDescription,
                    inputSchema: {
                        type: "object",
                        properties: {
                            sql: {
                                type: "string",
                                description: "The SQL query to execute",
                            },
                        },
                        required: ["sql"],
                    },
                }]
        };
    });
    const shutdown = async (signal) => {
        try {
            // Only attempt to close the pool if it was created
            if (poolPromise) {
                const pool = await poolPromise;
                await pool.end();
            }
        }
        catch (err) {
            throw err;
        }
    };
    process.on("SIGINT", async () => {
        try {
            await shutdown("SIGINT");
            process.exit(0);
        }
        catch (err) {
        }
    });
    process.on("SIGTERM", async () => {
        try {
            await shutdown("SIGTERM");
            process.exit(0);
        }
        catch (err) {
        }
    });
    return server;
}
(async () => {
    const mcpServer = createMcpServer({});
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
})();
//# sourceMappingURL=index.js.map