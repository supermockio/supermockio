import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler, HttpStatus } from "@nestjs/common"
import { Observable } from "rxjs"
import { map } from "rxjs/operators"

export interface Response<T> {
  status: number
  message: string
  data?: T
  timestamp: string
  path: string
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest()
    const statusCode = context.switchToHttp().getResponse().statusCode

    return next.handle().pipe(
      map((data) => {
        // If data is already in our format, return it as is
        if (data && data.status && data.message) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
            path: request.url,
          }
        }

        // Otherwise, format the response
        return {
          status: statusCode || HttpStatus.OK,
          message: "Success",
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
        }
      }),
    )
  }
}

