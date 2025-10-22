import SqlParser, { AST } from "node-sql-parser";

const { Parser } = SqlParser;
const parser = new Parser();

const getQueryTypes = async (query: string): Promise<string[]> => {
  try {
    const astOrArray: AST | AST[] = parser.astify(query, { database: 'mysql' });
    const statements = Array.isArray(astOrArray) ? astOrArray : [astOrArray];

    return statements.map((item) => item.type?.toLocaleLowerCase() ?? 'unknown');
  }
  catch(error: any) {
    throw new Error(`Parsing failed: ${error.message}`);
  }
}

export {
  getQueryTypes,
}