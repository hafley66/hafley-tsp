/**
 * TypeScript interfaces for complex decorator value types.
 * These mirror the TypeSpec models in lib/models.tsp.
 */

export interface AmqpChannelBindingsDef {
  is?: string;
  exchange?: {
    name?: string;
    type?: string;
    durable?: boolean;
    autoDelete?: boolean;
    vhost?: string;
  };
  queue?: {
    name?: string;
    durable?: boolean;
    exclusive?: boolean;
    autoDelete?: boolean;
    vhost?: string;
  };
}

export interface AmqpOperationBindingsDef {
  expiration?: number;
  userId?: string;
  cc?: string[];
  priority?: number;
  deliveryMode?: number;
  mandatory?: boolean;
  bcc?: string[];
  timestamp?: boolean;
  ack?: boolean;
}
