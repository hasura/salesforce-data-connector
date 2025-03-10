import { JSONValue, InternalServerError } from "@hasura/ndc-lambda-sdk";
import { exchangeOAuthCodeForToken } from "@hasura/ndc-duckduckapi";

export const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID!;
if (!SALESFORCE_CLIENT_ID) {
  throw new Error("SALESFORCE_CLIENT_ID is not set");
}

export const AUTHORIZATION_ENDPOINT =
  "https://login.salesforce.com/services/oauth2/authorize";

const TOKEN_ENDPOINT = "https://login.salesforce.com/services/oauth2/token";

export function getTenantIdFromHeaders(headers: JSONValue): string {
  if (!headers) throw new InternalServerError("Header forwarding not enabled");

  const tenantIdPropertyName =
    process.env.HEADERS_TENANT_ID_PROPERTY_NAME ?? "tenantId";

  return (headers.value as any)?.[tenantIdPropertyName.toLowerCase()];
}

export async function exchangeSalesforceOAuthCode(req: {
  code: string;
  codeVerifier?: string;
  redirectUri: string;
}) {
  const data = await exchangeOAuthCodeForToken({
    ...req,
    tokenEndpoint: TOKEN_ENDPOINT,
    clientId: SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  });

  return data;
}
