namespace AsyncAPI;

model AmqpExchangeBindings {
  name?: string;
  /** "topic", "direct", "fanout", "default", "headers" */
  type?: string;
  durable?: boolean;
  autoDelete?: boolean;
  vhost?: string;
}

model AmqpQueueBindings {
  name?: string;
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  vhost?: string;
}

model AmqpChannelBindings {
  /** "queue" or "routingKey" */
  `is`?: string;

  /** Exchange configuration (when is = "routingKey") */
  exchange?: AmqpExchangeBindings;

  /** Queue configuration (when is = "queue") */
  queue?: AmqpQueueBindings;
}

model AmqpOperationBindings {
  expiration?: int32;
  userId?: string;
  cc?: string[];
  priority?: int32;
  deliveryMode?: int32;
  mandatory?: boolean;
  bcc?: string[];
  timestamp?: boolean;
  ack?: boolean;
}
