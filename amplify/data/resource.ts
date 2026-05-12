import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // 1. DRIVER PROFILE
  Driver: a.model({
    fullName: a.string(),
    email: a.string().required(),
    phoneNumber: a.string(),
    status: a.string(), 
    walletBalance: a.float(),
  }).authorization((allow) => [allow.owner(), allow.guest()]),

  // 2. ORDER DETAILS
  Order: a.model({
    customerName: a.string(),
    pickup: a.string(),
    dropoff: a.string(),
    fee: a.float(),
    status: a.string(), // 'Pending', 'Accepted', 'Completed'
    driverId: a.string(),
    driverLat: a.float(),
    driverLng: a.float(),
  }).authorization((allow) => [allow.owner(), allow.guest()]),

  // 3. CHAT ENGINE
  ChatMessage: a.model({
    orderId: a.string().required(),
    text: a.string(),
    type: a.string(), // 'text', 'image', 'audio', 'location', 'document'
    mediaUrl: a.string(),
    fileName: a.string(),
    sender: a.string().required(), // 'Driver' or 'Customer'
    timestamp: a.datetime(),
  }).authorization((allow) => [allow.owner(), allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({ 
  schema, 
  authorizationModes: { 
    defaultAuthorizationMode: 'apiKey' 
  } 
});
