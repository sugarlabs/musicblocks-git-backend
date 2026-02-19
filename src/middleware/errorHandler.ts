import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import AppError from "../utils/error/errorClass";

export const errorHandler: ErrorRequestHandler = (
    err: unknown,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
) => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            code: err.code,
            message: err.message
        })
        return
    }

    console.error(err);

    // this is default if err is not an instance of AppError 
    res.status(500).json({
        success: false,
        code: "internal_server_error",
        message: "Something went wrong",
    })
    return
}