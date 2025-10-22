import * as mysql2 from 'mysql2/promise';
declare let poolPromise: Promise<mysql2.Pool>;
declare const getPool: () => Promise<mysql2.Pool>;
declare const executeQuery: <T>(sql: string, params?: string[]) => Promise<T>;
declare const executeReadOnlyQuery: <T>(sql: string) => Promise<T>;
export { poolPromise, getPool, executeQuery, executeReadOnlyQuery, };
//# sourceMappingURL=index.d.ts.map