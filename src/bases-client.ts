import fetch from "cross-fetch";
import { AuthenticationError, BasesClientError } from "./errors";

type Config = {
  org: string;
  db: string;
  token: string;
  tbl?: string;
};

export default class BasesClient {
  #config: Config
  #currentTable: string | null = null;
  #authToken: string | null = null;
  #baseUrl = "https://bases.datasketch.co";

  constructor(config: Config) {
    const { tbl, ...restConfig } = config;
    this.#config = restConfig;
    if (tbl) {
      this.setTable(tbl);
    }
  }

  async setTable(tbl: string): Promise<void> {
    if (this.#currentTable !== tbl) {
      this.#currentTable = tbl;
      this.#authToken = null;
      await this.#authenticate();
    }
  }

  async #authenticate(): Promise<void> {
    if (!this.#currentTable) {
      throw new Error("Table not set. Call setTable() before making any requests.");
    }
    
    try {
      const response = await fetch(
        "https://api.datasketch.co/v1/auth/bases",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...this.#config,
            tbl: this.#currentTable
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthenticationError("Invalid credentials provided");
        } else {
          throw new BasesClientError(
            `HTTP error: ${response.status} ${response.statusText}`
          );
        }
      }

      const data = await response.json();
      const authToken = data.data;

      if (!authToken) {
        throw new AuthenticationError("Auth token not provided in response");
      }

      this.#authToken = authToken;
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof BasesClientError
      ) {
        throw error;
      } else {
        throw new BasesClientError(
          `Failed to authenticate: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  async #fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.#authToken) {
      await this.#authenticate();
    }
    const url = new URL(endpoint, this.#baseUrl);
    return fetch(url.toString(), {
      ...options,
      headers: {
        ...options.headers,
        'X-DSKTCH-AUTHORIZATION': `Bearer ${this.#authToken}`,
      },
    });
  }

  async getRecords<T>(): Promise<T[]> {
    const response = await this.#fetch("md");
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async getRecord<T>(id: string): Promise<T | null> {
    const response = await this.#fetch(`md?field=rcd___id&value=${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  }

  async insertRecords<T>(data: T): Promise<{ inserted_ids: string[] }> {
    const response = await this.#fetch("md/insert", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return { inserted_ids: result.inserted_ids };
  }

  async updateRecord<T>(id: string, data: Partial<T>): Promise<void> {
    const response = await this.#fetch("md/update", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, data }),
    });
    
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
  }
  
  async deleteRecord(id: string): Promise<void> {
    const response = await this.#fetch("md/delete", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });
    
    if (!response.ok) {
      throw new BasesClientError(`HTTP error: ${response.status} ${response.statusText}`);
    }
  }
}
