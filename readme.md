# Mobile app integrity

This project uses a cloudflare worker as a backend used to verify the integrity of a mobile application client using Google's Play Integrity API.

## Creating from Scratch

To create this project from scratch:
- Run `npm create cloudflare` using the hello world example.

Next we install the library `web-auth-library` which is used to obtain an access token from Google to use the play integrity API:
- `npm install web-auth-library@1.0.3 --save-exact`

Note: This library is used instead of Firebase Admin SDK which is not compatible with Cloudflare Workers. See [ref](https://community.cloudflare.com/t/example-google-oauth-2-0-for-service-accounts-using-cf-worker/258220/2).

We need our Google credentials for the service account associated with Play Integrity. 

### Creating a Service Account
In the [Play Console](https://play.google.com/console/) visit `App Integrity` > Google Cloud project: `View project`. This goes to `console.cloud.google.com` and allows us to click `Create Credentials`:
- The API should be "Google Play Integrity API"
- Check the radio button `Application Data`
- Click `Next`
- Give the account a name (eg `play-integrity`)
- Give the account a description (eg `Verify my app Play Integrity`)
- Click `Create and Continue`
- Choose a Role (I chose Firebase Admin SDK)
- Click `Done`

Next, we need a key for this service account:
- Click the service account you created
- Click the `Keys` tab
- Click `Add Key` and choose `Create new key`
- Choose the `JSON` key type and click `Create`
- You can save this file temporarily for uploading as a secret to Cloudflare

### Upload Key to Cloudflare
- Login to Cloudflare to add your JSON file to the Environment Variables of your Cloudflare Worker
- The Environment variable should be called `GOOGLE_CLOUD_CREDENTIALS` and the value is the contents of the JSON file
- Choose `Encrypt` before saving and deploying

### The Code
We'll follow [this guide](https://developer.android.com/google/play/integrity/classic) to use Google's servers to decrypt the Play Integrity token.

First we need an access token:
```typescript
	const accessToken = await getAccessToken({
		credentials: env.GOOGLE_CLOUD_CREDENTIALS,
		scope: "https://www.googleapis.com/auth/playintegrity",
	  });
```

We can then call to decode the integrity token:

```typescript
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
		const response = await res.json();
```

In the above code `integrityToken` is a variable passed in from the mobile application. The response gives us the verict of whether the mobile application client looks legitimate.

Here's an example response from the Play Integrity API:

```json
{
          "tokenPayloadExternal": {
            "requestDetails": {
              "requestPackageName": "com.myapp",
              "timestampMillis": "1705428550115",
              "nonce": "3e8a756e-9555-40ea-bb18-18ebe68fcd90"
            },
            "appIntegrity": {
              "appRecognitionVerdict": "UNRECOGNIZED_VERSION",
              "packageName": "com.myapp",
              "certificateSha256Digest": [
                "lDDakzlkObg9sTcq2Rh8VnTBu7bUVtNPJnWogSiaiLM"
              ],
              "versionCode": "49"
            },
            "deviceIntegrity": {
              "deviceRecognitionVerdict": [
                "MEETS_DEVICE_INTEGRITY"
              ]
            },
            "accountDetails": {
              "appLicensingVerdict": "LICENSED"
            }
          }
        }
```

Based on this response's `appLicensingVerdict`, `appRecognitionVerdict`, `deviceRecognitionVerdict` we make a judgement call as to what to do with this app. You would normally make the `integrityToken` part of a API call in your backend that is important, such as updating personal or payment information. By validating the `integrityToken` as well as the user's authentication token we are verifying if the request is coming from a legitimate source (ie a unaltered App from the Play Store).

```typescript
		if (response.tokenPayloadExternal.appIntegrity.appRecognitionVerdict == 'PLAY_RECOGNIZED' &&
			response.tokenPayloadExternal.deviceIntegrity.deviceRecognitionVerdict.includes('MEETS_DEVICE_INTEGRITY') &&
			response.tokenPayloadExternal.accountDetails.appLicensingVerdict == 'LICENSED'
		) {
			return new Response('Your device looks legit!');
		} else {
			console.error('Failed Play Integrity', response);
			return new Response("Failed", { status: 401 });
		}
```