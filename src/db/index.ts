import { performance } from "perf_hooks";
import * as mysql2 from 'mysql2/promise';
import { getQueryTypes } from '../utils.js';

let poolPromise:Promise<mysql2.Pool>;

const getPool = ():Promise<mysql2.Pool> => {
  if (!poolPromise) {
    poolPromise = new Promise<mysql2.Pool>((resolve, reject) => {
      try {
        const pool = mysql2.createPool({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306'),
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          connectionLimit: 10,
        });
  
        resolve(pool);
      }
      catch(error) {
        reject(error);
      }
    });
  }

  return poolPromise;
}

const executeQuery = async <T>(sql: string, params: string[] = []): Promise<T> => {
  let connection;
  try {
    const pool = await getPool();
    connection = await pool.getConnection();
    const result = await connection.query(sql, params);
    return (Array.isArray(result) ? result[0] : result) as T;
  }
  catch(error) {
    throw error;
  }
  finally {
    if (connection) {
      connection.release();
    }
  }
}

const executeReadOnlyQuery = async <T>(sql: string): Promise<T> => {
  const queryTypes = await getQueryTypes(sql);

  if (!queryTypes.includes('select')) {
    return {
      content: [
        {
          type: "text",
          text: `目前只开放查询操作`,
        },
      ],
      isError: true,
    } as T;
  }
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    const startTime = performance.now();
    const result = await connection.query(sql);
    const endTime = performance.now();
    const duration = endTime - startTime;
    const rows = Array.isArray(result) ? result[0] : result;
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(rows, null, 2),
      }, {
        type: 'text',
        text: `查询执行耗时: ${duration.toFixed(2)} 毫秒`,
      }],
      isError: false,
    } as T;
  }
  catch(error) {
    throw error;
  }
  finally {
    if (connection) {
      connection.release();
    }
  }
}

export {
  poolPromise,
  getPool,
  executeQuery,
  executeReadOnlyQuery,
}