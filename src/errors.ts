class BasesClientError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BasesClientError';
    }
}

class AuthenticationError extends BasesClientError {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}


export { AuthenticationError, BasesClientError }