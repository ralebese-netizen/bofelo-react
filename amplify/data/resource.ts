import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Driver: a
    .model({
      fullName: a.string(),
      email: a.string().required(),
      phoneNumber: a.string(),
      homeAddress: a.string(),
      idPhotoPath: a.string(),
      selfiePath: a.string(),
      status: a.string(), 
      vehicleType: a.string(),
      plateNumber: a.string(),
      kinName: a.string(),
      kinPhone: a.string(),
    })
    // This allows the person who created the profile to read/edit it
    // and allows us to create profiles during registration
    .authorization((allow) => [allow.owner(), allow.guest()]), 
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // We use 'userPool' so it links to your Login system
    defaultAuthorizationMode: 'userPool',
  },
});
