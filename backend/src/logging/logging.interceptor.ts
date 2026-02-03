import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const responseTime = Date.now() - now;
        this.logger.log(
          `${method} ${url} ${res.statusCode} - ${responseTime}ms`,
        );
      }),
    );
  }
}
