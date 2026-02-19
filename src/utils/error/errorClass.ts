import { ErrorCode } from "./errorCodes";
import { mapStatusCode } from "./mapStatusCode";

class AppError extends Error {

    public statusCode: number;

    constructor(
        public code: ErrorCode,
        message?: string
    ) {
        super(message);
        this.name = "AppError";
        this.statusCode = mapStatusCode(code);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export default AppError;