import { HttpExceptionFilter } from './http-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { vi } from 'vitest';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockRequest = {
      method: 'GET',
      url: '/test',
      headers: {
        'x-correlation-id': 'test-123',
      },
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const mockHttpArgumentsHost = {
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
      getNext: vi.fn(),
    };

    mockHost = {
      switchToHttp: () => mockHttpArgumentsHost,
      getArgByIndex: vi.fn(),
      getArgs: vi.fn(),
      getType: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
    } as unknown as ArgumentsHost;
  });

  it('should handle standard HttpExceptions', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Forbidden',
      correlationId: 'test-123',
    });
  });

  it('should handle class-validator error arrays', () => {
    const exception = new HttpException(
      {
        message: ['email must be an email', 'password is too short'],
        error: 'Bad Request',
        statusCode: 400,
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      correlationId: 'test-123',
      details: [
        { message: 'email must be an email' },
        { message: 'password is too short' },
      ],
    });
  });

  it('should handle unexpected generic Errors as 500s', () => {
    const exception = new Error('Database connection failed');
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      correlationId: 'test-123',
    });
  });
});
