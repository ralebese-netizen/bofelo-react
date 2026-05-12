import { signIn, signUp, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

// 1. LOGIN USER
export async function loginUser(email, password) {
    try {
        const { isSignedIn } = await signIn({ username: email, password });
        return { success: isSignedIn };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 2. REGISTER DRIVER (Includes ID and Selfie upload)
export async function registerDriver(email, password, driverDetails, idFile, selfieFile) {
    try {
        // Step A: Create the user in AWS Cognito
        const { userId } = await signUp({
            username: email,
            password,
            options: { userAttributes: { email } }
        });

        // Step B: Upload Documents to S3 (AWS Storage)
        const idPath = `driver_docs/${userId}/id_photo`;
        const selfiePath = `driver_docs/${userId}/selfie`;

        await Promise.all([
            uploadData({ path: idPath, data: idFile }).result,
            uploadData({ path: selfiePath, data: selfieFile }).result
        ]);

        // Step C: Save Profile to DynamoDB (AWS Data)
        // This assumes you've defined a 'Driver' model in your amplify/data/resource.ts
        await client.models.Driver.create({
            ...driverDetails,
            email: email,
            idPhotoPath: idPath,
            selfiePath: selfiePath,
            status: 'pending'
        });

        return { success: true };
    } catch (error) {
        console.error("Registration failed", error);
        return { success: false, error: error.message };
    }
}

// 3. LOGOUT
export async function logoutDriver() {
    await signOut();
    window.location.reload();
}
