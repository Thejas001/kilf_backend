import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Literature Festival API',
      version: '1.0.0',
      description:
        'REST API for the Literature Festival Admin Panel and public festival website: ' +
        'authentication, festival & ticket management, bookings, payments, check-in, sponsors and revenue.',
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local development' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: {} },
          },
        },
      },
    },
    tags: [
      { name: 'Admin Auth' },
      { name: 'Admin Dashboard' },
      { name: 'Admin Festivals' },
      { name: 'Admin Tickets' },
      { name: 'Admin Bookings' },
      { name: 'Admin Check-in' },
      { name: 'Admin Sponsors' },
      { name: 'Admin Revenue' },
      { name: 'Admin Audit Logs' },
      { name: 'Public Tickets' },
      { name: 'Public Bookings' },
      { name: 'Public Sponsors' },
      { name: 'Webhooks' },
    ],
  },
  apis: ['./src/routes/**/*.ts', './dist/routes/**/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
