import { JSONValue } from "@hasura/ndc-lambda-sdk";
import {
  AUTHORIZATION_ENDPOINT,
  exchangeSalesforceOAuthCode,
  getTenantIdFromHeaders,
  SALESFORCE_CLIENT_ID,
} from "./lib/lib";
import { TenantManager } from "./lib/TenantManager";
import {
  DDNJobStatusV1,
  DDNOAuthProviderCodeLoginRequestV1,
  DDNConnectorEndpointsConfigV1,
  DDNConfigResponseV1,
} from "@hasura/ndc-duckduckapi";

const tenants = new Map<string, TenantManager>();

// Add cleanup function
async function cleanup() {
  console.log("Cleaning up databases...");
  for (const [tenantId, tenant] of tenants) {
    console.log(`Closing database for tenant ${tenantId}...`);
    await tenant.cleanup();
  }
  console.log("All databases closed.");
  process.exit(0);
}

// Register cleanup handler
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

function getTenant(tenantId: string): TenantManager {
  let tenant = tenants.get(tenantId);
  if (!tenant) {
    tenant = new TenantManager(tenantId);
    tenants.set(tenantId, tenant);
  }
  return tenant;
}

/**
 * $ddn.config
 *  @readonly
 */
export async function _ddnConfig(): Promise<DDNConfigResponseV1> {
  const config: DDNConnectorEndpointsConfigV1 = {
    version: 1,
    jobs: [
      {
        id: "my-salesforce-job",
        title: "Salesforce",
        functions: {
          status: {
            functionTag: "salesforceStatus",
          },
        },
        oauthProviders: [
          {
            id: "my-salesforce-provider",
            template: "salesforce",
            oauthCodeLogin: {
              functionTag: "salesforceLogin",
            },
            oauthDetails: {
              clientId: SALESFORCE_CLIENT_ID,
              authorizationEndpoint: AUTHORIZATION_ENDPOINT,
              scopes: "api refresh_token",
              pkceRequired: process.env.SALESFORCE_PKCE_REQUIRED === "true",
            },
          },
        ],
      },
    ],
  };

  return {
    version: 1,
    config: JSON.stringify(config),
  };
}

/**
 *  $ddn.functions.salesforceStatus
 *  @readonly
 * */
export async function _ddnSalesforceStatus(
  headers: JSONValue
): Promise<DDNJobStatusV1> {
  const tenantId = getTenantIdFromHeaders(headers);
  const tenant = getTenant(tenantId);

  return {
    ok: tenant.status.ok,
    message: tenant.status.message,
  };
}

/**
 * $ddn.functions.salesforceLogin
 */
export async function _ddnSalesforceLogin(
  req: DDNOAuthProviderCodeLoginRequestV1,
  userConfig: string,
  headers: JSONValue
): Promise<DDNJobStatusV1> {
  const tenantId = getTenantIdFromHeaders(headers);
  const tenant = getTenant(tenantId);

  try {
    const tokenData = await exchangeSalesforceOAuthCode(req);

    await tenant.setUserConfig(tokenData);

    tenant.run();

    return {
      ok: true,
      message: "Setting up...",
    };
  } catch (e) {
    return {
      ok: false,
      message: `${e}`,
    };
  }
}
