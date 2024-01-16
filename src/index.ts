import { getAccessToken } from "web-auth-library/google";
import { IntegrityResponse } from "./integrity-response";

export interface Env {
	GOOGLE_CLOUD_CREDENTIALS: string;
	PACKAGE_NAME: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return await validateIntegrityToken(request, env);
	},
};

async function validateIntegrityToken(request: Request, env: Env): Promise<Response> {
	// Make sure the request has includes the integrity token sent from the mobile app
	const body: any = await request.json();
	const integrityToken = body.token;
	if (!integrityToken) {
		throw new Error(`integrity token is missing`);
	}

	try {
		// Get an Access token to call Google APIs
		const accessToken = await getAccessToken({
			credentials: env.GOOGLE_CLOUD_CREDENTIALS,
			scope: "https://www.googleapis.com/auth/playintegrity",
		});


		// Call the play integrity API to get a verdict
		const res = await fetch(
			`https://playintegrity.googleapis.com/v1/${env.PACKAGE_NAME}:decodeIntegrityToken`,
			{
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Content-Type': `application/json`
				},
				body: JSON.stringify({ integrity_token: integrityToken })
			}
		);
		const response: IntegrityResponse = await res.json();


		// Make a determination of whether the app is legitimate (return 200) or dodgy (return 401)
		if (response.tokenPayloadExternal.appIntegrity.appRecognitionVerdict == 'PLAY_RECOGNIZED' &&
			response.tokenPayloadExternal.deviceIntegrity.deviceRecognitionVerdict.includes('MEETS_DEVICE_INTEGRITY') &&
			response.tokenPayloadExternal.accountDetails.appLicensingVerdict == 'LICENSED'
		) {
			return new Response('Your device looks legit!');
		} else {
			console.error('Failed Play Integrity', response);
			return new Response("Failed", { status: 401 });
		}
	} catch (err) {
		console.error(`Exception`, err);
		return new Response("Error", { status: 401 });
	}
}
