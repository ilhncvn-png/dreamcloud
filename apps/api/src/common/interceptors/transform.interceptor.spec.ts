import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

const mockRequest = { url: '/api/v1/dreams' };

const stubHandler = jest.fn();
const stubClass = jest.fn();

const buildContext = (): ExecutionContext =>
  ({
    getHandler: () => stubHandler,
    getClass: () => stubClass,
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  }) as unknown as ExecutionContext;

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new TransformInterceptor(reflector);
  });

  it('wraps the response in { data, timestamp, path }', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    interceptor
      .intercept(buildContext(), { handle: () => of({ id: 1, title: 'test' }) })
      .subscribe((result) => {
        expect(result).toEqual(
          expect.objectContaining({
            data: { id: 1, title: 'test' },
            path: '/api/v1/dreams',
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          }),
        );
        done();
      });
  });

  it('passes through the response unchanged when bypass flag is set', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    interceptor
      .intercept(buildContext(), { handle: () => of({ status: 'ok' }) })
      .subscribe((result) => {
        expect(result).toEqual({ status: 'ok' });
        done();
      });
  });

  it('passes handler and class to reflector when checking bypass flag', () => {
    const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    interceptor.intercept(buildContext(), { handle: () => of(null) }).subscribe();

    expect(spy).toHaveBeenCalledWith(expect.any(String), [stubHandler, stubClass]);
  });
});
