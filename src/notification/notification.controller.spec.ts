import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PasswordResetEmailDto } from './dto/password-reset-email.dto';
import { RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';

describe('NotificationController', () => {
  let controller: NotificationController;
  let notificationService: NotificationService;

  // Mock del NotificationService
  const mockNotificationService = {
    sendEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handlePasswordResetEmail', () => {
    const mockPasswordResetEmailDto: PasswordResetEmailDto = {
      email: 'test@example.com',
      resetToken: 'mock-reset-token',
    };

    const mockSuccessResponse = {
      message: 'Email sent successfully',
      statusCode: 200,
    };

    it('should successfully send password reset email', async () => {
      mockNotificationService.sendEmail.mockResolvedValueOnce(mockSuccessResponse);

      const result = await controller.handlePasswordResetEmail(mockPasswordResetEmailDto);

      expect(notificationService.sendEmail).toHaveBeenCalledWith(mockPasswordResetEmailDto);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle service errors properly', async () => {
      const mockError = new RpcException({
        message: 'Failed to send email',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });

      mockNotificationService.sendEmail.mockRejectedValueOnce(mockError);

      await expect(
        controller.handlePasswordResetEmail(mockPasswordResetEmailDto)
      ).rejects.toThrow(mockError);

      expect(notificationService.sendEmail).toHaveBeenCalledWith(mockPasswordResetEmailDto);
    });

    it('should pass the DTO to the service without modification', async () => {
      mockNotificationService.sendEmail.mockResolvedValueOnce(mockSuccessResponse);

      await controller.handlePasswordResetEmail(mockPasswordResetEmailDto);

      expect(notificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockPasswordResetEmailDto.email,
          resetToken: mockPasswordResetEmailDto.resetToken
        })
      );
    });

    it('should handle service timeout', async () => {
      const timeoutError = new RpcException({
        message: 'Service Timeout',
        status: HttpStatus.REQUEST_TIMEOUT,
      });

      mockNotificationService.sendEmail.mockRejectedValueOnce(timeoutError);

      await expect(
        controller.handlePasswordResetEmail(mockPasswordResetEmailDto)
      ).rejects.toThrow(timeoutError);
    });

    it('should maintain the error status code from the service', async () => {
      const customError = new RpcException({
        message: 'Custom service error',
        status: HttpStatus.BAD_REQUEST,
      });

      mockNotificationService.sendEmail.mockRejectedValueOnce(customError);

      await expect(
        controller.handlePasswordResetEmail(mockPasswordResetEmailDto)
      ).rejects.toThrow(customError);
    });
  });
});