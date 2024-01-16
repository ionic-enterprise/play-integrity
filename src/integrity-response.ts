export interface IntegrityResponse {
    tokenPayloadExternal: TokenPayloadExternal
  }
  
  export interface TokenPayloadExternal {
    requestDetails: RequestDetails
    appIntegrity: AppIntegrity
    deviceIntegrity: DeviceIntegrity
    accountDetails: AccountDetails
  }
  
  export interface RequestDetails {
    requestPackageName: string
    timestampMillis: string
    nonce: string
  }
  
  export interface AppIntegrity {
    appRecognitionVerdict: string
    packageName: string
    certificateSha256Digest: string[]
    versionCode: string
  }
  
  export interface DeviceIntegrity {
    deviceRecognitionVerdict: string[]
  }
  
  export interface AccountDetails {
    appLicensingVerdict: string
  }