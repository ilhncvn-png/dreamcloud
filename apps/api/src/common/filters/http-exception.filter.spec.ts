import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

const mockSend = jest.fn().mockReturnValue(undefined);
const mockStatus = jest.fn(() => ({ send: mockSend }));
const mockReply = { status: mockStatus };
const mockRequest = { url: '/api/v1/test', method: 'GET' };

const createHost = (): ArgumentsHost =>
  ({
    switchToHttp: () => ({
      getResponse: () => mockReply,
      getRequest: () => mockRequest,
    }),
  }) as unknown as ArgumentsHost;

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.clearAllMocks();
  });

  it('sends structured 400 response for a simple string message', () => {
    filter.catch(new HttpException('Bad input', HttpStatus.BAD_REQUEST), createHost());

    expect(mockStatus).toHaveBeenCalledWith(400);
    const body = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(body['statusCode']).toBe(400);
    expect(body['message']).toBe('Bad input');
    expect(body['path']).toBe('/api/v1/test');
    expect(typeof body['timestamp']).toBe('string');
  });

  it('extracts message array and error string from object response', () => {
    filter.catch(
      new HttpException(
        { message: ['field required'], error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      ),
      createHost(),
    );

    const body = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(body['message']).toEqual(['field required']);
    expect(body['error']).toBe('Bad Request');
  });

  it('falls back to HttpStatus name when error field is absent', () => {
    filter.catch(new HttpException({ message: 'not found' }, HttpStatus.NOT_FOUND), createHost());

    const body = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(body['error']).toBe('NOT_FOUND');
  });

  it('uses exception message when response is a plain string', () => {
    const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    filter.catch(exception, createHost());

    const body = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect(body['message']).toBe('Unauthorized');
  });

  it('calls logger.error for 5xx responses', () => {
    const loggerSpy = jest
      .spyOn((filter as unknown as { logger: { error: jest.Mock } }).logger, 'error')
      .mockReturnValue(undefined);

    filter.catch(new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR), createHost());

    expect(loggerSpy).toHaveBeenCalled();
  });

  it('does not call logger.error for 4xx responses', () => {
    const loggerSpy = jest
      .spyOn((filter as unknown as { logger: { error: jest.Mock } }).logger, 'error')
      .mockReturnValue(undefined);

    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), createHost());

    expect(loggerSpy).not.toHaveBeenCalled();
  });
});
