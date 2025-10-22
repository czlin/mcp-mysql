import SqlParser from "node-sql-parser";
const { Parser } = SqlParser;
const parser = new Parser();
const getQueryTypes = async (query) => {
    try {
        const astOrArray = parser.astify(query, { database: 'mysql' });
        const statements = Array.isArray(astOrArray) ? astOrArray : [astOrArray];
        return statements.map((item) => item.type?.toLocaleLowerCase() ?? 'unknown');
    }
    catch (error) {
        throw new Error(`Parsing failed: ${error.message}`);
    }
};
export { getQueryTypes, };
//# sourceMappingURL=utils.js.map